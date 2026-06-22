import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Calendar, Mail, Phone, Github, Linkedin, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import TopExpertsDisplay from './TopExperts';
import ScoreDisplay from './ScoreDisplay';

const Button = ({ children, variant = 'primary', onClick, className = '' }) => {
    const baseClasses = 'px-3 py-2 rounded-md font-medium focus:outline-none transition-colors duration-200';
    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
        outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
        ghost: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            onClick={onClick}
        >
            {children}
        </button>
    );
};

const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <X size={24} />
                </button>
                {children}
            </div>
        </div>
    );
};

const ExpandableSection = ({ title, content }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mb-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex justify-between items-center w-full text-left font-semibold mb-2 text-gray-700 dark:text-gray-300"
            >
                {title}
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-4"
                    >
                        {content}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const CandidateCard = ({ candidate, jobId, onSelect, onReject, onSchedule,darkMode}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [scoreData, setScoreData] = useState(null);
    const [topExperts, setTopExperts] = useState([]);
    const [explanation, setExplanation] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchScoreData = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/api/score-candidate/${jobId}/${candidate.email}`);
            setScoreData(response.data.matchResult);
            setTopExperts(response.data.topExperts || []);
            setExplanation(response.data.explanation || '');
        } catch (error) {
            console.error('Error fetching score data:', error);
        } finally {
            setIsLoading(false);
        }
    };
    const ensureAbsoluteUrl = (url) => {
        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
          return `https://${url}`;
        }
        return url;
      };

    useEffect(() => {
        fetchScoreData();
    }, []);


    return (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden mb-4">
            <div className="p-4">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl font-semibold text-gray-700 dark:text-gray-300">
                        {candidate.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{candidate.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{candidate.resumeData?.position}</p>
                    </div>
                </div>
                <div className="mt-4 flex space-x-4">
                    <a href={`mailto:${candidate.email}`} className="text-blue-500 hover:underline flex items-center dark:text-blue-400">
                        <Mail size={16} className="mr-1" /> Email
                    </a>
                    <a href={`tel:${candidate.resumeData?.phone}`} className="text-blue-500 hover:underline flex items-center dark:text-blue-400">
                        <Phone size={16} className="mr-1" /> Call
                    </a>
                    {candidate.resumeData?.github && (
                        <a href={ensureAbsoluteUrl(candidate.resumeData.github)} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center dark:text-blue-400">
                            <Github size={16} className="mr-1" /> GitHub
                        </a>
                    )}
                    {candidate.resumeData?.linkedin && (
                        <a href={ensureAbsoluteUrl(candidate.resumeData.linkedin)} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center dark:text-blue-400">
                            <Linkedin size={16} className="mr-1" /> LinkedIn
                        </a>
                    )}
                </div>

                {isLoading ? (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <p className="text-center text-gray-700 dark:text-gray-300">Calculating scores...</p>
                    <motion.div
                        className="w-8 h-8 border-t-2 border-blue-500 rounded-full mx-auto mt-2"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                </div>
            ) : scoreData ? (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Match Scores</h4>
                    <ScoreDisplay scoreData={scoreData} explanation={explanation} isLoading={false} darkMode={darkMode} />
                </div>
            ) : null}

            {topExperts.length > 0 && <TopExpertsDisplay experts={topExperts} />}


                <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsModalOpen(true)}>View Details</Button>
                    {candidate.status === 'applied' ? (
                        <>
                            <Button variant="outline" onClick={() => onReject(candidate)}>
                                <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button onClick={() => onSelect(candidate)}>
                                <Check className="w-4 h-4 mr-1" /> Select
                            </Button>
                        </>
                    ) : candidate.status === 'selected' ? (
                        <Button onClick={() => onSchedule(candidate)}>
                            <Calendar className="w-4 h-4 mr-1" /> Schedule Interview
                        </Button>
                    ) : (
                        <p className="text-red-500">Rejected</p>
                    )}
                </div>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">{candidate.name}</h2>
                <ExpandableSection
                    title="Skills"
                    content={<p className="text-gray-700 dark:text-gray-300">{candidate.resumeData?.skills?.join(', ')}</p>}
                />
                <ExpandableSection
                    title="Experience"
                    content={
                        <div>
                            {candidate.resumeData?.experiences?.map((exp, index) => (
                                <div key={index} className="mb-4">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{exp.company}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{exp.duration}</p>
                                    <ul className="list-disc pl-5 mt-2">
                                        {exp.responsibilities.map((resp, respIndex) => (
                                            <li key={respIndex} className="text-gray-700 dark:text-gray-300 mb-1">
                                                {resp}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    }
                />
                <ExpandableSection
                    title="Projects"
                    content={
                        <div>
                            {candidate.resumeData?.projects?.map((project, index) => (
                                <div key={index} className="mb-4">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{project.name}</p>
                                    <ul className="list-disc pl-5 mt-2">
                                        {project.details.map((detail, detailIndex) => (
                                            <li key={detailIndex} className="text-gray-700 dark:text-gray-300 mb-1">
                                                {detail}
                                            </li>
                                        ))}
                                    </ul>
                                    {project.link && (
                                        <p className="text-sm text-blue-500 dark:text-blue-400 mt-2">
                                            <a href={project.link} target="_blank" rel="noopener noreferrer">Project Link</a>
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    }
                />
            </Modal>
        </div>
    );
};

const CandidateDetailsPage = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const [jobDetails, setJobDetails] = useState(null);
    const [candidates, setCandidates] = useState([]);

    useEffect(() => {
        const fetchJobDetails = async () => {
            try {
                const response = await api.get(`/api/job-openings/${jobId}`);
                setJobDetails(response.data);
                fetchCandidates();
            } catch (error) {
                console.error('Error fetching job details:', error);
            }
        };
        fetchJobDetails();
    }, [jobId]);

    const fetchCandidates = async () => {
        try {
            const response = await api.get(`/api/job-openings/${jobId}/candidates`);
            setCandidates(response.data);
        } catch (error) {
            console.error('Error fetching candidates:', error);
        }
    };

    const handleSelect = async (candidate) => {
        try {
            await api.post(`/api/job-openings/${jobId}/select-candidate`, { email: candidate.email });
            fetchCandidates();
        } catch (error) {
            console.error('Error selecting candidate:', error);
        }
    };

    const handleReject = async (candidate) => {
        try {
            await api.post(`/api/job-openings/${jobId}/reject-candidate`, { email: candidate.email });
            fetchCandidates();
        } catch (error) {
            console.error('Error rejecting candidate:', error);
        }
    };

    const handleSchedule = (candidate) => {
        console.log('Scheduling interview for', candidate.name);
        // Implement the scheduling logic here
    };

    return (
        <div className="container mx-auto p-8 bg-gray-100 dark:bg-gray-900 min-h-screen">
            <Button variant="ghost" onClick={() => navigate('/dashboard/client')} className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold mb-8 text-gray-900 dark:text-white"
            >
                Candidates for {jobDetails?.title}
            </motion.h1>
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-12"
            >
                <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Candidates</h2>
                <div className="space-y-4">
                    <AnimatePresence>
                        {candidates.map(candidate => (
                            <motion.div
                                key={candidate._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <CandidateCard
                                    candidate={candidate}
                                    jobId={jobId}
                                    onSelect={handleSelect}
                                    onReject={handleReject}
                                    onSchedule={handleSchedule}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </motion.section>
        </div>
    );
};

export default CandidateDetailsPage;