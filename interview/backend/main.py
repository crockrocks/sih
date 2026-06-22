from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from werkzeug.security import check_password_hash, generate_password_hash
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime
import os
import json
import logging
import traceback
import shutil
import tempfile
import asyncio
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s — %(message)s',
)
logger = logging.getLogger(__name__)

from config import Config
from parse import extract_text_from_pdf, parse_resume
from retrieval.qdrant_client import ensure_collections, upsert_resume, upsert_job
from retrieval.embeddings import get_dense_model
from graph.graph import get_compiled_graph
from graph.state import ScreeningState
from evaluation.ragas_mlflow import compute_and_log_ragas
from score import score_experts_batch

load_dotenv()

UPLOAD_FOLDER = Config.UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'pdf'}


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    try:
        ensure_collections()
    except Exception as e:
        logger.warning('Qdrant collection setup failed (non-fatal): %s', e)
    try:
        get_dense_model()
    except Exception as e:
        logger.warning('Embedding model pre-warm failed (non-fatal): %s', e)
    yield


app = FastAPI(title='InterviewAssist API', version='2.0.0', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5174', 'http://localhost:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

motor_client = AsyncIOMotorClient(Config.MONGO_URI)
db = motor_client['SIH']
users_collection = db['User']
resume_collection = db['UserResume']
job_openings_collection = db['JobOpening']
application_collection = db['application']
employee_collection = db['Employee']


def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def serialize_doc(doc: dict) -> dict:
    if doc is None:
        return None
    doc['_id'] = str(doc['_id'])
    return doc


# ──────────────────────────────────────────────────────────────
# Request models
# ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    isEmployee: bool = False
    employeeId: str = ''


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ──────────────────────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────────────────────

@app.post('/api/register', status_code=201)
async def register(data: RegisterRequest):
    if data.isEmployee:
        if await users_collection.find_one({'emp_code': data.employeeId}):
            raise HTTPException(status_code=400, detail='Employee ID already exists.')
    if await users_collection.find_one({'email': data.email}):
        raise HTTPException(status_code=400, detail='Email already exists.')

    hashed_password = generate_password_hash(data.password)
    new_user = {
        'name': data.name,
        'email': data.email,
        'password': hashed_password,
        'employee': data.isEmployee,
        'emp_code': data.employeeId if data.isEmployee else None,
    }
    result = await users_collection.insert_one(new_user)
    logger.info('Registered user %s (employee=%s)', data.email, data.isEmployee)
    return {
        'success': True,
        'message': 'Registration successful.',
        'user_id': str(result.inserted_id),
        'is_employee': new_user['employee'],
        'employee_code': new_user['emp_code'],
    }


@app.post('/api/login')
async def login(data: LoginRequest):
    user = await users_collection.find_one({'email': data.email})
    if not user or not check_password_hash(user['password'], data.password):
        raise HTTPException(status_code=401, detail='Invalid email or password')

    resume_data = await resume_collection.find_one({'email': data.email})
    response_data = {
        'success': True,
        'userId': str(user['_id']),
        'isEmployee': user.get('employee', False),
        'employeeCode': user.get('emp_code'),
    }
    if resume_data:
        resume_data.pop('_id', None)
        response_data['resumeData'] = resume_data
    logger.info('Login: %s', data.email)
    return response_data


# ──────────────────────────────────────────────────────────────
# Resume Parsing
# ──────────────────────────────────────────────────────────────

@app.post('/api/parse-resume')
async def parse_resume_route(resume: UploadFile = File(...)):
    if not allowed_file(resume.filename):
        raise HTTPException(status_code=400, detail='Only PDF files are allowed.')

    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        shutil.copyfileobj(resume.file, tmp)
        tmp_path = tmp.name

    try:
        loop = asyncio.get_running_loop()
        text = await loop.run_in_executor(None, extract_text_from_pdf, tmp_path)
        if not text:
            raise ValueError('No text extracted from the document')
        parsed_data = await loop.run_in_executor(None, parse_resume, text)
        logger.info('[PARSE] parsed_data=%s', json.dumps(parsed_data, default=str))
        return {'success': True, 'parsed_data': parsed_data}
    except Exception as e:
        logger.error('[PARSE] failed: %s', e)
        raise HTTPException(status_code=500, detail=f'Error parsing resume: {str(e)}')
    finally:
        os.unlink(tmp_path)


# ──────────────────────────────────────────────────────────────
# Submit Interview (+ Qdrant upsert)
# ──────────────────────────────────────────────────────────────

@app.post('/api/submit-interview')
async def submit_interview(
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    position: str = Form(...),
    linkedin: str = Form(''),
    github: str = Form(''),
    coverLetter: str = Form(''),
    skills: str = Form('[]'),
    experiences: str = Form('[]'),
    projects: str = Form('[]'),
    educations: str = Form('[]'),
    certifications: str = Form('[]'),
    resume: UploadFile = File(None),
):
    filename = None
    if resume and resume.filename and allowed_file(resume.filename):
        filename = f'{name}_{resume.filename}'
        resume_path = os.path.join(UPLOAD_FOLDER, filename)
        with open(resume_path, 'wb') as f:
            shutil.copyfileobj(resume.file, f)

    interview_data = {
        'name': name,
        'email': email,
        'phone': phone,
        'position': position,
        'linkedin': linkedin,
        'github': github,
        'coverLetter': coverLetter,
        'skills': json.loads(skills),
        'experiences': json.loads(experiences),
        'projects': json.loads(projects),
        'educations': json.loads(educations),
        'certifications': json.loads(certifications),
        'resume_filename': filename,
    }

    await resume_collection.update_one(
        {'email': email},
        {'$set': interview_data},
        upsert=True,
    )
    user_data = await resume_collection.find_one({'email': email})
    mongo_id = str(user_data['_id'])
    user_data['_id'] = mongo_id

    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, upsert_resume, interview_data, mongo_id)
    except Exception as e:
        logger.warning('Qdrant resume upsert failed (non-fatal): %s', e)

    logger.info('Resume submitted/updated for %s', email)
    return {
        'success': True,
        'message': 'Interview submission successful.',
        'user_id': mongo_id,
        'userData': user_data,
    }


# ──────────────────────────────────────────────────────────────
# User Routes
# ──────────────────────────────────────────────────────────────

@app.get('/api/user/{user_id}')
async def get_user_data(user_id: str):
    if not user_id or user_id == 'null':
        raise HTTPException(status_code=400, detail='Invalid or missing user ID')
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail='Invalid user ID format')

    user_data = await users_collection.find_one({'_id': ObjectId(user_id)})
    if not user_data:
        raise HTTPException(status_code=404, detail='User not found')

    user_data['_id'] = str(user_data['_id'])
    user_data.pop('password', None)

    resume_data = await resume_collection.find_one({'email': user_data['email']})
    if resume_data:
        user_data['phone'] = resume_data.get('phone')
        user_data['position'] = resume_data.get('position')

    return user_data


@app.get('/api/user-resume')
async def get_user_resume(email: str):
    if not email:
        raise HTTPException(status_code=400, detail='Email parameter is required')
    user_resume = await resume_collection.find_one({'email': email})
    if not user_resume:
        raise HTTPException(status_code=404, detail='User resume not found')
    user_resume['_id'] = str(user_resume['_id'])
    return user_resume


@app.get('/api/user-applications/{user_id}')
async def get_user_applications(user_id: str):
    cursor = application_collection.find({'userId': user_id})
    apps = await cursor.to_list(length=None)
    for application in apps:
        application['_id'] = str(application['_id'])
        job = await job_openings_collection.find_one({'_id': ObjectId(application['jobId'])})
        if job:
            application['jobDetails'] = {
                'title': job.get('title'),
                'company': job.get('company'),
                'shortDescription': job.get('shortDescription'),
                'pay': job.get('pay'),
                'level': job.get('level'),
            }
        else:
            application['jobDetails'] = None
    return apps


# ──────────────────────────────────────────────────────────────
# Job Openings
# ──────────────────────────────────────────────────────────────

@app.get('/api/job-openings')
async def get_job_openings():
    cursor = job_openings_collection.find()
    jobs = await cursor.to_list(length=None)
    for job in jobs:
        job['_id'] = str(job['_id'])
        job['applicantCount'] = await application_collection.count_documents({'jobId': str(job['_id'])})
    return jobs


@app.post('/api/job-openings', status_code=201)
async def create_job_opening(request: Request):
    job_data = await request.json()
    result = await job_openings_collection.insert_one(job_data)
    mongo_id = str(result.inserted_id)
    job_data['_id'] = mongo_id

    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, upsert_job, job_data, mongo_id)
    except Exception as e:
        logger.warning('Qdrant job upsert failed (non-fatal): %s', e)

    return JSONResponse(status_code=201, content=job_data)


@app.get('/api/job-openings/{job_id}')
async def get_job_opening(job_id: str):
    job = await job_openings_collection.find_one({'_id': ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    job['_id'] = str(job['_id'])
    return job


@app.put('/api/job-openings/{job_id}')
async def update_job_opening(job_id: str, request: Request):
    job_data = await request.json()
    result = await job_openings_collection.update_one(
        {'_id': ObjectId(job_id)}, {'$set': job_data}
    )
    if not result.modified_count:
        raise HTTPException(status_code=404, detail='No job opening found with that ID')
    return {'message': 'Job opening updated successfully'}


@app.delete('/api/job-openings/{job_id}')
async def delete_job_opening(job_id: str):
    result = await job_openings_collection.delete_one({'_id': ObjectId(job_id)})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail='No job opening found with that ID')
    return {'message': 'Job opening deleted successfully'}


@app.get('/api/job-openings/{job_id}/candidates')
async def get_job_candidates(job_id: str):
    cursor = application_collection.find({'jobId': job_id})
    candidates = await cursor.to_list(length=None)
    for candidate in candidates:
        candidate['_id'] = str(candidate['_id'])
        user = await users_collection.find_one({'_id': ObjectId(candidate['userId'])})
        if user:
            candidate['name'] = user.get('name')
        resume = await resume_collection.find_one({'email': candidate['email']})
        if resume:
            resume['_id'] = str(resume['_id'])
            candidate['resumeData'] = resume
    return candidates


@app.post('/api/job-openings/{job_id}/apply')
async def apply_for_job(job_id: str, request: Request):
    data = await request.json()
    user_id = data.get('userId')
    applicant_email = data.get('email')
    if not user_id or not applicant_email:
        raise HTTPException(status_code=400, detail='User ID and email are required')

    existing = await application_collection.find_one({'userId': user_id, 'jobId': job_id})
    if existing:
        raise HTTPException(status_code=400, detail='You have already applied for this job')

    result = await application_collection.insert_one({
        'userId': user_id,
        'jobId': job_id,
        'email': applicant_email,
        'status': 'applied',
        'appliedAt': datetime.utcnow(),
    })
    return {'message': 'Application submitted successfully', 'applicationId': str(result.inserted_id)}


@app.post('/api/job-openings/{job_id}/select-candidate')
async def select_candidate(job_id: str, request: Request):
    data = await request.json()
    email = data.get('email')
    if not email:
        raise HTTPException(status_code=400, detail='Email is required')
    result = await application_collection.update_one(
        {'jobId': job_id, 'email': email}, {'$set': {'status': 'selected'}}
    )
    if not result.modified_count:
        raise HTTPException(status_code=404, detail='No application found with that email for this job')
    return {'message': 'Candidate selected successfully'}


@app.post('/api/job-openings/{job_id}/reject-candidate')
async def reject_candidate(job_id: str, request: Request):
    data = await request.json()
    email = data.get('email')
    if not email:
        raise HTTPException(status_code=400, detail='Email is required')
    result = await application_collection.update_one(
        {'jobId': job_id, 'email': email}, {'$set': {'status': 'rejected'}}
    )
    if not result.modified_count:
        raise HTTPException(status_code=404, detail='No application found with that email for this job')
    return {'message': 'Candidate rejected successfully'}


# ──────────────────────────────────────────────────────────────
# Scoring — LangGraph pipeline
# ──────────────────────────────────────────────────────────────

@app.get('/api/score-candidate/{job_id}/{candidate_email}')
async def score_candidate(job_id: str, candidate_email: str):
    logger.info('Scoring request: job_id=%s email=%s', job_id, candidate_email)

    job = await job_openings_collection.find_one({'_id': ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')

    candidate_resume = await resume_collection.find_one({'email': candidate_email})
    if not candidate_resume:
        raise HTTPException(status_code=404, detail='Candidate resume not found')

    # Return cached score if already computed for this candidate+job
    application = await application_collection.find_one(
        {'jobId': job_id, 'email': candidate_email}
    )
    if application and application.get('scoreResult'):
        logger.info('Returning cached score for %s / %s', candidate_email, job_id)
        return application['scoreResult']

    job['_id'] = str(job['_id'])
    candidate_resume['_id'] = str(candidate_resume['_id'])

    job_description = job['fullDescription']
    experts = await employee_collection.find().to_list(length=None)
    logger.info('Scoring %s for job %s — %d experts found', candidate_email, job_id, len(experts))

    loop = asyncio.get_running_loop()

    # Rank all experts via a single batch embedding — zero LLM calls
    top_experts = await loop.run_in_executor(
        None, score_experts_batch, candidate_resume, job_description, experts
    )
    top_experts = top_experts[:5]

    # LangGraph screening pipeline
    query = f"Screen candidate {candidate_resume.get('name')} for {job.get('title')} role"
    graph = get_compiled_graph()
    initial_state: ScreeningState = {
        'query': query,
        'intent': '',
        'candidate_data': candidate_resume,
        'job_data': job,
        'retrieved_context': [],
        'retry_count': 0,
        'is_relevant': False,
        'answer': {},
        'ragas_scores': {},
    }

    final_state = await loop.run_in_executor(None, graph.invoke, initial_state)

    # RAGAS evaluation (non-fatal)
    answer_text = final_state['answer'].get('raw_llm_output', str(final_state['answer']))
    contexts = final_state.get('retrieved_context', [])
    ragas_scores = {}
    try:
        ragas_scores = await loop.run_in_executor(
            None,
            compute_and_log_ragas,
            query,
            answer_text,
            contexts,
            f'screening_{job_id}_{candidate_email[:10]}',
        )
    except Exception as e:
        logger.warning('RAGAS evaluation failed (non-fatal): %s', e)

    result = {
        'matchResult': final_state['answer'].get('scores', {}),
        'candidateName': candidate_resume['name'],
        'jobTitle': job['title'],
        'topExperts': top_experts,
        'explanation': final_state['answer'].get('explanation', ''),
        'ragasScores': ragas_scores,
    }

    # Persist score to the application document so subsequent calls are instant
    if application:
        await application_collection.update_one(
            {'jobId': job_id, 'email': candidate_email},
            {'$set': {'scoreResult': result, 'scoredAt': datetime.utcnow()}},
        )

    return result


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)
