import React, { useState, useEffect } from 'react';
import api from '../api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useParams } from 'react-router-dom';

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { userId } = useParams();
  const [jobs, setJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId || userId === 'undefined') {
        setError('Invalid or missing user ID.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get(`/api/user/${userId}`);
        setUserData(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error.response?.data?.error || 'Unable to fetch user data.');
      }
    };

    const fetchJobs = async () => {
      try {
        const [jobsResponse, userApplicationsResponse] = await Promise.all([
          api.get('/api/job-openings'),
          api.get(`/api/user-applications/${userId}`)
        ]);

        const allJobs = jobsResponse.data;
        const userApplications = userApplicationsResponse.data;

        const appliedJobIds = new Set(userApplications.map(app => app.jobId));

        const applied = userApplications.map(app => ({
          ...app.jobDetails,
          _id: app.jobId,
          status: app.status
        }));
        const available = allJobs.filter(job => !appliedJobIds.has(job._id));

        setAppliedJobs(applied);
        setJobs(available);
      } catch (error) {
        console.error('Error fetching jobs:', error);
        setError('Unable to fetch job openings.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
    fetchJobs();
  }, [userId]);

  const applyForJob = async (jobId) => {
    if (userData) {
      try {
        await api.post(`/api/job-openings/${jobId}/apply`, {
          userId: userId,
          email: userData.email
        });

        // Refetch jobs to update the lists
        const [jobsResponse, userApplicationsResponse] = await Promise.all([
          api.get('/api/job-openings'),
          api.get(`/api/user-applications/${userId}`)
        ]);

        const allJobs = jobsResponse.data;
        const userApplications = userApplicationsResponse.data;

        const appliedJobIds = new Set(userApplications.map(app => app.jobId));

        const applied = userApplications.map(app => ({
          ...app.jobDetails,
          _id: app.jobId,
          status: app.status
        }));
        const available = allJobs.filter(job => !appliedJobIds.has(job._id));

        setAppliedJobs(applied);
        setJobs(available);
      } catch (error) {
        console.error('Error applying for job:', error);
        setError('Unable to apply for the job. Please try again.');
      }
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-100 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-100 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Warning!</strong>
        <span className="block sm:inline"> No user data found. Please try again or contact support.</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen dark:bg-gray-800 dark:text-white">
      {/* Sidebar */}
      <div className={`bg-gray-100 dark:bg-gray-700 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-16'}`}>
        <button onClick={toggleSidebar} className="w-full p-4 flex justify-end">
          {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
        </button>
        {isSidebarOpen && (
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
            <p className="mb-2"><strong>Name:</strong> {userData.name || 'Not available'}</p>
            <p className="mb-2"><strong>Email:</strong> {userData.email || 'Not available'}</p>
            <p className="mb-2"><strong>Phone:</strong> {userData.phone || 'Not available'}</p>
            <p className="mb-2"><strong>Position:</strong> {userData.position || 'Not available'}</p>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Welcome, {userData.name || 'User'}!</h1>

        {/* Available Openings */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Available Openings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobCard key={job._id} job={job} onApply={() => applyForJob(job._id)} />
            ))}
          </div>
        </section>

        {/* Applied Jobs */}
        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-6">Applied Jobs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appliedJobs.map((job) => (
              <JobCard key={job._id} job={job} applied status={job.status} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const JobCard = ({ job, onApply, applied, status }) => (
  <div className="bg-white dark:bg-gray-700 shadow-lg rounded-lg overflow-hidden transition transform hover:shadow-xl">
    <div className="p-6">
      <h3 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">{job.title}</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4">{job.company}</p>
      <p className="mb-2 text-gray-700 dark:text-gray-300">{job.shortDescription}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">Pay: {job.pay}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">Level: {job.level}</p>
    </div>
    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-600">
      {applied ? (
        <p className={`font-bold ${
          status === 'rejected' ? 'text-red-600 dark:text-red-400' :
          status === 'selected' ? 'text-green-600 dark:text-green-400' :
          'text-blue-600 dark:text-blue-400'
        }`}>
          {status === 'rejected' ? 'Rejected' :
           status === 'selected' ? 'Selected' :
           'Applied'}
        </p>
      ) : (
        <button
          onClick={onApply}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Apply
        </button>
      )}
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div className="flex h-screen dark:bg-gray-800">
    <div className="w-64 bg-gray-100 dark:bg-gray-700">
      <div className="h-full animate-pulse bg-gray-200 dark:bg-gray-600"></div>
    </div>
    <div className="flex-1 p-8">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    </div>
  </div>
);

export default Dashboard;