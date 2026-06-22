import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.environ.get('MONGO_URI')
    DB_NAME = "SIH"
    COLLECTION_NAME = "UserResume"
    UPLOAD_FOLDER = 'uploads'
    GROQ_AI_KEY = os.environ.get('GROQ_AI_KEY')

    # Local LLM (llama.cpp server — OpenAI-compatible)
    USE_LOCAL_LLM = os.environ.get('USE_LOCAL_LLM', 'false').lower() == 'true'
    LOCAL_LLM_URL = os.environ.get('LOCAL_LLM_URL', 'http://localhost:8080/v1')
    LOCAL_LLM_MODEL = os.environ.get('LOCAL_LLM_MODEL', 'local')

    # Qdrant
    QDRANT_HOST = os.environ.get('QDRANT_HOST', 'localhost')
    QDRANT_PORT = int(os.environ.get('QDRANT_PORT', '6333'))
    QDRANT_RESUMES_COLLECTION = 'resumes'
    QDRANT_JOBS_COLLECTION = 'job_descriptions'

    # Embeddings (fastembed / ONNX — no scikit-learn dependency)
    EMBEDDING_MODEL = 'BAAI/bge-small-en-v1.5'
    DENSE_VECTOR_SIZE = 384

    # MLflow
    MLFLOW_TRACKING_URI = os.environ.get('MLFLOW_TRACKING_URI', 'http://localhost:5001')
    MLFLOW_EXPERIMENT_NAME = 'interview_assist_screening'

    # LangGraph
    MAX_RETRIEVAL_RETRIES = 2

    # Context budget — keeps every LLM call well under local model limits
    MAX_RESUME_TEXT_CHARS = 8000   # raw PDF text fed to parse.py
    MAX_JOB_DESC_CHARS    = 800    # job description in any prompt
    MAX_PROFILE_CHARS     = 1000   # formatted candidate/expert profile
    MAX_CONTEXT_CHARS_PER_DOC = 400  # each Qdrant retrieved document
    MAX_EXPERT_CANDIDATES = 3      # experts passed to LLM (rest ranked by embeddings)

    TABLE_SCHEMA = {
        "_id": "ObjectId",
        "name": "string",
        "email": "string",
        "phone": "string",
        "position": "string",
        "coverLetter": "string",
        "skills": "string",
        "experience": "string or null",
        "resume_filename": "string",
        "parsed_data": {
            "name": "string",
            "phone": "string",
            "email": "string",
            "linkedin": "string",
            "skills": "string",
            "experience": "string or null",
            "certifications": "string",
            "education": "string"
        }
    }

    SCHEMA_DESCRIPTION = '''
Here is the description to determine what each key represents:
1. _id:
    - Description: Unique identifier for the document.
2. name:
    - Description: Candidate's full name.
3. email:
    - Description: Candidate's email address.
4. phone:
    - Description: Candidate's phone number.
5. position:
    - Description: Position for which the candidate is applying.
6. coverLetter:
    - Description: Cover letter submitted by the candidate.
7. skills:
    - Description: Skills listed by the candidate.
8. experience:
    - Description: Work experience of the candidate (can be null if not available).
9. resume_filename:
    - Description: Filename of the uploaded resume.
10. parsed_data:
    - Description: Parsed data from the resume.
    - Fields:
        - name: Candidate's full name.
        - phone: Candidate's phone number.
        - email: Candidate's email address.
        - linkedin: Candidate's LinkedIn profile URL.
        - skills: Skills listed in the resume.
        - experience: Work experience mentioned in the resume.
        - certifications: Certifications obtained by the candidate.
        - education: Candidate's educational background.
'''


    FEW_SHOT_EXAMPLE_1 = {
        "input": """
        John Doe
        Email: john.doe@email.com | Phone: (123) 456-7890 | LinkedIn: linkedin.com/in/johndoe

        Summary:
        Experienced software engineer with 5+ years in full-stack development, specializing in Python and JavaScript frameworks.

        Skills:
        - Programming: Python, JavaScript, Java, C++
        - Web Technologies: React, Node.js, Django, Flask
        - Databases: MongoDB, PostgreSQL, MySQL
        - DevOps: Docker, Kubernetes, AWS

        Experience:
        Senior Software Engineer | TechCorp Inc. | 2018 - Present
        - Led development of a scalable e-commerce platform using Django and React
        - Implemented CI/CD pipelines, reducing deployment time by 40%

        Software Developer | InnoSoft Solutions | 2016 - 2018
        - Developed RESTful APIs using Flask and integrated with front-end applications
        - Optimized database queries, improving application performance by 30%

        Education:
        Bachelor of Science in Computer Science | University of Technology | 2012 - 2016

        Certifications:
        - AWS Certified Developer - Associate
        - MongoDB Certified Developer
        """,
        "output": """
        Summary of John Doe's Resume:

        1. Contact Information:
           - Name: John Doe
           - Email: john.doe@email.com
           - Phone: (123) 456-7890
           - LinkedIn: linkedin.com/in/johndoe

        2. Professional Summary:
           Experienced software engineer with over 5 years in full-stack development, focusing on Python and JavaScript frameworks.

        3. Key Skills:
           - Programming languages: Python, JavaScript, Java, C++
           - Web technologies: React, Node.js, Django, Flask
           - Databases: MongoDB, PostgreSQL, MySQL
           - DevOps tools: Docker, Kubernetes, AWS

        4. Work Experience:
           Total Experience: 7 years (as of 2024)
           a. Senior Software Engineer at TechCorp Inc. (2018 - Present, 6 years)
              - Led e-commerce platform development (Django, React)
              - Implemented CI/CD pipelines, improving efficiency
           b. Software Developer at InnoSoft Solutions (2016 - 2018, 2 years)
              - Developed RESTful APIs (Flask)
              - Optimized database performance

        5. Education:
           Bachelor of Science in Computer Science from University of Technology (2012 - 2016)

        6. Certifications:
           - AWS Certified Developer - Associate
           - MongoDB Certified Developer

        This candidate has a strong background in full-stack development with expertise in Python and JavaScript ecosystems, as well as experience with cloud technologies and databases. With 7 years of progressive experience, John Doe has demonstrated growth from a Software Developer to a Senior Software Engineer role.
        """
    }

    FEW_SHOT_EXAMPLE_2 = {
        "input": """
        Jane Smith
        Email: jane.smith@email.com | Phone: (987) 654-3210 | Location: New York, NY

        Professional Summary:
        Data Scientist with 3+ years of experience in machine learning and statistical analysis. Passionate about leveraging data to drive business decisions.

        Technical Skills:
        - Languages: Python, R, SQL
        - Machine Learning: Scikit-learn, TensorFlow, Keras
        - Data Visualization: Tableau, Matplotlib, Seaborn
        - Big Data: Spark, Hadoop

        Work History:
        Data Scientist | DataTech Analytics | 2020 - Present
        - Developed predictive models for customer churn, increasing retention by 15%
        - Created an automated reporting system using Python and Tableau

        Junior Data Analyst | InsightCorp | 2018 - 2020
        - Conducted A/B tests to optimize marketing campaigns
        - Performed exploratory data analysis on large datasets

        Education:
        Master of Science in Data Science | Data University | 2016 - 2018
        Bachelor of Science in Statistics | State College | 2012 - 2016

        Projects:
        - Sentiment Analysis of Social Media Data
        - Time Series Forecasting for Stock Prices
        """,
        "output": """
        Summary of Jane Smith's Resume:

        1. Contact Information:
           - Name: Jane Smith
           - Email: jane.smith@email.com
           - Phone: (987) 654-3210
           - Location: New York, NY

        2. Professional Summary:
           Data Scientist with 5+ years of experience, specializing in machine learning and statistical analysis. Focused on using data to inform business decisions.

        3. Technical Skills:
           - Programming: Python, R, SQL
           - Machine Learning: Scikit-learn, TensorFlow, Keras
           - Data Visualization: Tableau, Matplotlib, Seaborn
           - Big Data: Spark, Hadoop

        4. Work Experience:
           Total Experience: 6 years (as of 2024)
           a. Data Scientist at DataTech Analytics (2020 - Present, 4 years)
              - Developed predictive models for customer retention
              - Created automated reporting systems
           b. Junior Data Analyst at InsightCorp (2018 - 2020, 2 years)
              - Conducted A/B tests for marketing optimization
              - Performed exploratory data analysis

        5. Education:
           - Master of Science in Data Science from Data University (2016 - 2018)
           - Bachelor of Science in Statistics from State College (2012 - 2016)

        6. Notable Projects:
           - Sentiment Analysis of Social Media Data
           - Time Series Forecasting for Stock Prices

        This candidate has a strong background in data science with 6 years of progressive experience, starting as a Junior Data Analyst and advancing to a Data Scientist role. Jane Smith's skills span various data science tools and technologies, making her well-suited for roles requiring both technical expertise and business acumen in data-driven decision making.
        """
    }
