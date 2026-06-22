import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaLinkedin, FaGithub, FaFileUpload } from 'react-icons/fa';
import api from '../api';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Button,
  Input,
  Textarea,
  Separator,
  Label
} from './ui/custom-components';

const ExperienceCard = ({ experience, onEdit, onDelete, darkMode }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card className={`mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
      <CardHeader className="flex justify-between items-center">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
          {isEditing ? 'Edit Experience' : experience.company || 'New Experience'}
        </h3>
        <div>
          <Button
            type="button" // Add this line
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault(); // Add this line
              setIsEditing(!isEditing);
            }}
          >
            <FaEdit />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault(); // Add this line
              onDelete();
            }}
          >
            <FaTrash />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <Input
            value={experience.company}
            onChange={(e) => onEdit({ ...experience, company: e.target.value })}
            placeholder="Company"
          />
          <Input
            value={experience.duration}
            onChange={(e) => onEdit({ ...experience, duration: e.target.value })}
            placeholder="Duration"
          />
          <Textarea
            value={experience.responsibilities.join('\n')}
            onChange={(e) => onEdit({ ...experience, responsibilities: e.target.value.split('\n').filter(r => r.trim() !== '') })}
            placeholder="Responsibilities (one per line)"
          />
        </div>
      </CardContent>
    </Card>
  );
};

const EducationCard = ({ education, onEdit, onDelete, darkMode }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card className={`mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
      <CardHeader className="flex justify-between items-center">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
          {isEditing ? 'Edit Education' : education.institution || 'New Education'}
        </h3>
        <div>
          <Button
            type="button" // Add this line
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault(); // Add this line
              setIsEditing(!isEditing);
            }}
          >
            <FaEdit />
          </Button>
          <Button
            type="button" // Add this line
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault(); // Add this line
              onDelete();
            }}
          >
            <FaTrash />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Input
            value={education.institution}
            onChange={(e) => onEdit({ ...education, institution: e.target.value })}
            placeholder="Institution"
          />
          <Input
            value={education.degree}
            onChange={(e) => onEdit({ ...education, degree: e.target.value })}
            placeholder="Degree"
          />
          <Input
            value={education.year}
            onChange={(e) => onEdit({ ...education, year: e.target.value })}
            placeholder="Year of Graduation"
          />
        </div>
      </CardContent>
    </Card>
  );
};


const ProjectCard = ({ project, onEdit, onDelete, darkMode }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card className={`mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
      <CardHeader className="flex justify-between items-center">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
          {isEditing ? 'Edit Project' : project.name || 'New Project'}
        </h3>
        <div>
          <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); setIsEditing(!isEditing); }}>
            <FaEdit />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); onDelete(); }}>
            <FaTrash />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Input
            value={project.name}
            onChange={(e) => onEdit({ ...project, name: e.target.value })}
            placeholder="Project Name"
          />
          <Textarea
            value={project.details.join('\n')}
            onChange={(e) => onEdit({ ...project, details: e.target.value.split('\n').filter(d => d.trim() !== '') })}
            placeholder="Project Details (one per line)"
          />
        </div>
      </CardContent>
    </Card>
  );
};

const SkillsCard = ({ skills, availableSkills, onAddSkill, onRemoveSkill }) => {
  const [newSkill, setNewSkill] = useState('');

  const handleAddSkill = (e) => {
    e.preventDefault(); // Prevent form submission
    if (newSkill && !skills.includes(newSkill)) {
      onAddSkill(newSkill);
      setNewSkill('');
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <h3 className="text-lg font-semibold">Skills</h3>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {skills.map((skill, index) => (
            <div key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center">
              {skill}
              <button
                type="button"
                onClick={() => onRemoveSkill(skill)}
                className="ml-2 text-red-500">
                &times;
              </button>
            </div>
          ))}
        </div>
        <div className="flex">
          <Input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Add a skill"
            list="availableSkills"
          />
          <datalist id="availableSkills">
            {availableSkills.map((skill, index) => (
              <option key={index} value={skill} />
            ))}
          </datalist>
          <Button
            type="button"
            onClick={handleAddSkill}
            className="ml-2">
            <FaPlus />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


function InterviewForm({ darkMode, onLogout }) {
  const [formData, setFormData] = useState({
    name: '',
    email: localStorage.getItem('userEmail') || '',
    phone: '',
    position: '',
    coverLetter: '',
    resume: null,
    skills: [],
    experiences: [],
    projects: [],
    educations: [],
    linkedin: '',
    github: '',
    certifications: '',
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const availableSkills = ["JavaScript", "React", "Node.js", "Python", "Java", "C++", "SQL", "MongoDB"];

  const addSkill = (newSkill) => {
    if (newSkill && !formData.skills.includes(newSkill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill]
      }));
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const addExperience = (e) => {
    e.preventDefault(); // Prevent form submission
    setFormData(prev => ({
      ...prev,
      experiences: [...prev.experiences, { company: '', duration: '', responsibilities: [''] }]
    }));
  };

  const editExperience = (index, updatedExperience) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.map((exp, i) => i === index ? updatedExperience : exp)
    }));
  };

  const deleteExperience = (index) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

  const addEducation = (e) => {
    e.preventDefault(); // Prevent form submission
    setFormData(prev => ({
      ...prev,
      educations: [...prev.educations, { institution: '', degree: '', year: '' }]
    }));
  };



  const editEducation = (index, updatedEducation) => {
    setFormData(prev => ({
      ...prev,
      educations: prev.educations.map((edu, i) => i === index ? updatedEducation : edu)
    }));
  };

  const deleteEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      educations: prev.educations.filter((_, i) => i !== index)
    }));
  };

  const addProject = (e) => {
    e.preventDefault(); // Prevent form submission
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, { name: '', details: [''] }]
    }));
  };

  const editProject = (index, updatedProject) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.map((proj, i) => i === index ? updatedProject : proj)
    }));
  };

  const deleteProject = (index) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setLoading(true);
      const uploadData = new FormData();
      uploadData.append('resume', file);

      try {
        const response = await api.post('/api/parse-resume', uploadData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data && response.data.success) {
          const parsedData = response.data.parsed_data;

          setFormData(prev => ({
            ...prev,
            name: parsedData.Name || '',
            phone: parsedData.Phone || '',
            position: parsedData.Position || '',
            linkedin: parsedData['LinkedIn URL'] || '',
            github: parsedData['GitHub URL'] || '',
            skills: Array.isArray(parsedData.Skills) ? parsedData.Skills : [],
            experiences: Array.isArray(parsedData.Experiences)
              ? parsedData.Experiences.map(exp => ({
                company: exp.company || exp.Company || '',
                duration: exp.duration || exp.Duration || '',
                responsibilities: Array.isArray(exp.responsibilities) ? exp.responsibilities
                  : Array.isArray(exp.Responsibilities) ? exp.Responsibilities : []
              }))
              : [],
            educations: Array.isArray(parsedData.Education)
              ? parsedData.Education.map(edu => ({
                institution: edu.institution || edu.Institution || '',
                degree: edu.degree || edu.Degree || '',
                year: edu.year || edu.Year || ''
              }))
              : [],
            projects: Array.isArray(parsedData.Projects)
              ? parsedData.Projects.map(proj => ({
                  name: proj.name || proj.Name || '',
                  details: Array.isArray(proj.details) ? proj.details
                    : Array.isArray(proj.Details) ? proj.Details : [proj.details || proj.Details || '']
                }))
              : [],
            certifications: parsedData.Certifications || '',
            coverLetter: parsedData['Cover Letter'] || '',
            resume: file
          }));

          console.log('Form data updated with parsed resume data:', parsedData);
        } else {
          console.error('Failed to parse resume:', response.data);
          alert('Failed to parse resume. Please try again.');
        }
      } catch (error) {
        console.error('Error parsing resume:', error);
        alert('An error occurred while parsing the resume. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const submitFormData = new FormData();

    const basicFields = ['name', 'email', 'phone', 'position', 'linkedin', 'github', 'coverLetter'];
    basicFields.forEach(field => {
      submitFormData.append(field, formData[field] || '');
    });

    const arrayFields = ['skills', 'experiences', 'projects', 'educations'];
    arrayFields.forEach(field => {
      submitFormData.append(field, JSON.stringify(formData[field] || []));
    });

    submitFormData.append('certifications', JSON.stringify(formData.certifications.split('\n').filter(cert => cert.trim() !== '')));

    if (formData.resume) {
      submitFormData.append('resume', formData.resume);
    }

    try {
      const response = await api.post('/api/submit-interview', submitFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        localStorage.setItem('userResumeData', JSON.stringify(response.data.userData));
        alert('Form submitted successfully!');
        navigate(`/`);
      } else {
        alert('Failed to submit form. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred while submitting the form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen py-12`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg rounded-lg overflow-hidden`}>
          <CardHeader className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h1 className={`${darkMode ? 'text-white' : 'text-gray-900'} text-2xl font-bold`}>
                Please Fill In Your Details
              </h1>
              <Button onClick={onLogout} variant="outline">Logout</Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Resume Upload Section */}
              <div>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Resume Upload</h2>
                <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 dark:border-gray-600 px-6 py-10">
                  <div className="text-center">
                    <FaFileUpload className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                    <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
                      <label
                        htmlFor="resume-upload"
                        className="relative cursor-pointer rounded-md bg-white dark:bg-gray-700 font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                      >
                        <span>Upload a file</span>
                        <Input
                          id="resume-upload"
                          name="resume-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleResumeUpload}
                          accept=".pdf,.doc,.docx"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">PDF, DOC, or DOCX up to 10MB</p>
                  </div>
                </div>
                {formData.resume && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Selected file: {formData.resume.name}
                  </p>
                )}
              </div>

              <Separator className="my-8" />

              {/* Personal Information */}
              <div>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Personal Information</h2>
                <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position Applied For</Label>
                    <Input
                      id="position"
                      placeholder="Software Engineer"
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin">LinkedIn Profile</Label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 px-3 text-gray-500 dark:text-gray-400 sm:text-sm">
                        <FaLinkedin className="h-5 w-5" />
                      </span>
                      <Input
                        id="linkedin"
                        placeholder="linkedin.com/in/johndoe"
                        value={formData.linkedin}
                        onChange={(e) => handleInputChange('linkedin', e.target.value)}
                        className="rounded-none rounded-r-md"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="github">GitHub Profile</Label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 px-3 text-gray-500 dark:text-gray-400 sm:text-sm">
                        <FaGithub className="h-5 w-5" />
                      </span>
                      <Input
                        id="github"
                        placeholder="github.com/johndoe"
                        value={formData.github}
                        onChange={(e) => handleInputChange('github', e.target.value)}
                        className="rounded-none rounded-r-md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-8" />

              {/* Cover Letter */}
              <div>
                <Label htmlFor="cover-letter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cover Letter</Label>
                <div className="mt-1">
                  <Textarea
                    id="cover-letter"
                    placeholder="Tell us why you're perfect for this role..."
                    value={formData.coverLetter}
                    onChange={(e) => handleInputChange('coverLetter', e.target.value)}
                    rows="4"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <Separator className="my-8" />

              {/* Skills Section */}
              <div>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Skills</h2>
                <SkillsCard
                  skills={formData.skills}
                  availableSkills={availableSkills}
                  onAddSkill={addSkill}
                  onRemoveSkill={removeSkill}
                />
              </div>

              <Separator className="my-8" />

              <div>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Professional Experience</h2>
                {Array.isArray(formData.experiences) && formData.experiences.map((experience, index) => (
                  <ExperienceCard
                    key={index}
                    experience={experience}
                    onEdit={(updatedExperience) => editExperience(index, updatedExperience)}
                    onDelete={() => deleteExperience(index)}
                    darkMode={darkMode}
                  />
                ))}
                <div className="flex justify-center mt-4">
                  <Button onClick={addExperience} type="button" variant="outline" className="w-full sm:w-auto">
                    <FaPlus className="mr-2" /> Add Experience
                  </Button>
                </div>
              </div>

              <Separator className="my-8" />

              {/* Education Section */}
              <div>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Education</h2>
                {Array.isArray(formData.educations) && formData.educations.map((education, index) => (
                  <EducationCard
                    key={index}
                    education={education}
                    onEdit={(updatedEducation) => editEducation(index, updatedEducation)}
                    onDelete={() => deleteEducation(index)}
                    darkMode={darkMode}
                  />
                ))}
                <div className="flex justify-center mt-4">
                  <Button onClick={addEducation} type="button" variant="outline" className="w-full sm:w-auto">
                    <FaPlus className="mr-2" /> Add Education
                  </Button>
                </div>
              </div>

              <Separator className="my-8" />

              {/* Projects Section */}
              <div>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Projects</h2>
                {Array.isArray(formData.projects) && formData.projects.map((project, index) => (
                  <ProjectCard
                    key={index}
                    project={project}
                    onEdit={(updatedProject) => editProject(index, updatedProject)}
                    onDelete={() => deleteProject(index)}
                    darkMode={darkMode}
                  />
                ))}
                <div className="flex justify-center mt-4">
                  <Button onClick={addProject} type="button" variant="outline" className="w-full sm:w-auto">
                    <FaPlus className="mr-2" /> Add Project
                  </Button>
                </div>
              </div>

              <Separator className="my-8" />

              {/* Certifications Section */}
              <div>
                <Label htmlFor="certifications" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Certifications</Label>
                <div className="mt-1">
                  <Textarea
                    id="certifications"
                    placeholder="List your certifications (one per line)"
                    value={formData.certifications}
                    onChange={(e) => handleInputChange('certifications', e.target.value)}
                    rows="4"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center mt-8">
                <Button type="submit" className="w-full sm:w-auto px-8 py-3 text-lg" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default InterviewForm;