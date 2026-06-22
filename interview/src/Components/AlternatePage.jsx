import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, X, ChevronRight } from 'lucide-react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';

const CustomButton = ({ children, variant = 'primary', onClick, className = '' }) => {
  const baseClasses = 'px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-700',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
};

const CustomCard = ({ children, className = '', onClick }) => (
  <motion.div
    whileHover={{ scale: 1.02, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
    whileTap={{ scale: 0.98 }}
    className={`bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden ${className} cursor-pointer transition-all duration-200`}
    onClick={onClick}
  >
    {children}
  </motion.div>
);

const AlternatePage = () => {
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isReadMoreOpen, setReadMoreOpen] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    shortDescription: '',
    fullDescription: '',
    pay: '',
    level: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/api/job-openings');
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      showMessage('Error fetching job openings');
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const openJobModal = (job = null) => {
    if (job) {
      setNewJob({ ...job });
      setSelectedJob(job);
    } else {
      setNewJob({ title: '', company: '', shortDescription: '', fullDescription: '', pay: '', level: '' });
      setSelectedJob(null);
    }
    setModalOpen(true);
  };

  const handleSaveJob = async () => {
    if (newJob.title && newJob.company && newJob.shortDescription) {
      try {
        if (selectedJob) {
          await api.put(`/api/job-openings/${selectedJob._id}`, newJob);
          showMessage('Job opening updated successfully!');
        } else {
          await api.post('/api/job-openings', newJob);
          showMessage('New job opening created successfully!');
        }
        fetchJobs();
        setModalOpen(false);
      } catch (error) {
        console.error('Error saving job:', error);
        showMessage('Error saving job opening');
      }
    }
  };

  const deleteJob = async (jobId) => {
    try {
      await api.delete(`/api/job-openings/${jobId}`);
      showMessage('Job opening deleted successfully!');
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      showMessage('Error deleting job opening');
    }
  };

  const JobOpeningCard = ({ job }) => {
    const handleCardClick = () => {
      navigate(`/job/${job._id}/candidates`);
    };

    return (
      <CustomCard onClick={handleCardClick}>
        <div className="p-6">
          <h3 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">{job.title}</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{job.company}</p>
          <p className="mb-2 text-gray-700 dark:text-gray-300">{job.shortDescription}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pay: {job.pay}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Level: {job.level}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Applicants: {job.applicantCount}</p>
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-between">
          <CustomButton
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setReadMoreOpen(job);
            }}
          >
            Read More
          </CustomButton>
          <div>
            <CustomButton
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                openJobModal(job);
              }}
              className="mr-2"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </CustomButton>
            <CustomButton
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                deleteJob(job._id);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </CustomButton>
          </div>
        </div>
      </CustomCard>
    );
  };

  const ApplicationCard = ({ job }) => {
    const handleCardClick = () => {
      navigate(`/job/${job._id}/candidates`);
    };

    return (
      <CustomCard onClick={handleCardClick}>
        <div className="p-6">
          <h3 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">{job.title}</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{job.company}</p>
          <p className="mb-2 text-gray-700 dark:text-gray-300">No. of applicants: {job.applicantCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pay: {job.pay}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Level: {job.level}</p>
        </div>
        <motion.div
          className="px-6 py-2 bg-green-500 text-white flex items-center justify-center cursor-pointer"
          whileHover={{ y: -5 }}
        >
          <span>Review Applications</span>
          <ChevronRight className="ml-2" />
        </motion.div>
      </CustomCard>
    );
  };

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text">
      <div className="max-w-7xl mx-auto p-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold mb-8"
        >
          Job Postings Dashboard
        </motion.h1>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-4 p-4 bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200 rounded"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-3xl font-semibold"
            >
              Current Openings
            </motion.h2>
            <CustomButton onClick={() => openJobModal()}>Create New Opening</CustomButton>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {jobs.map((job, index) => (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <JobOpeningCard job={job} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="mb-12">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-3xl font-semibold mb-6"
          >
            Applications to Review
          </motion.h2>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {jobs.filter(job => job.applicantCount > 0).map((job, index) => (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
              >
                <ApplicationCard job={job} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Modal for job creation/editing */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md"
              >
                <h2 className="text-2xl font-bold mb-4">{selectedJob ? 'Edit Job Opening' : 'Create New Job Opening'}</h2>
                <input
                  className="w-full p-2 mb-4 border rounded dark:bg-gray-700 dark:text-white"
                  placeholder="Job Title"
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                />
                <input
                  className="w-full p-2 mb-4 border rounded dark:bg-gray-700 dark:text-white"
                  placeholder="Company Name"
                  value={newJob.company}
                  onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                />
                <textarea
                  className="w-full p-2 mb-4 border rounded dark:bg-gray-700 dark:text-white"
                  placeholder="Short Description"
                  value={newJob.shortDescription}
                  onChange={(e) => setNewJob({ ...newJob, shortDescription: e.target.value })}
                />
                <textarea
                  className="w-full p-2 mb-4 border rounded dark:bg-gray-700 dark:text-white"
                  placeholder="Full Description"
                  value={newJob.fullDescription}
                  onChange={(e) => setNewJob({ ...newJob, fullDescription: e.target.value })}
                />
                <input
                  className="w-full p-2 mb-4 border rounded dark:bg-gray-700 dark:text-white"
                  placeholder="Pay Range"
                  value={newJob.pay}
                  onChange={(e) => setNewJob({ ...newJob, pay: e.target.value })}
                />
                <input
                  className="w-full p-2 mb-4 border rounded dark:bg-gray-700 dark:text-white"
                  placeholder="Level"
                  value={newJob.level}
                  onChange={(e) => setNewJob({ ...newJob, level: e.target.value })}
                />
                <div className="flex justify-end">
                  <CustomButton variant="outline" onClick={() => setModalOpen(false)} className="mr-2">
                    Cancel
                  </CustomButton>
                  <CustomButton onClick={handleSaveJob}>
                    {selectedJob ? 'Update' : 'Create'}
                  </CustomButton>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        <AnimatePresence>
          {isReadMoreOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-2xl"
              >
                <h2 className="text-2xl font-bold mb-4">{isReadMoreOpen.title}</h2>
                <p className="mb-2">Company: {isReadMoreOpen.company}</p>
                <p className="mb-2">Pay: {isReadMoreOpen.pay}</p>
                <p className="mb-2">Level: {isReadMoreOpen.level}</p>
                <p className="mb-4">{isReadMoreOpen.fullDescription}</p>
                <div className="flex justify-end">
                  <CustomButton onClick={() => setReadMoreOpen(false)}>Close</CustomButton>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AlternatePage;