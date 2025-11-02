"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "../../../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
    Search, MapPin, Briefcase, Calendar, DollarSign,
    Filter, Star, ExternalLink, Clock, Building,
    Target, TrendingUp, Heart, ArrowRight, ChevronDown,
    Users, Award, CheckCircle
} from "lucide-react";

export default function JobsPage() {
    const params = useParams();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [preferredJobs, setPreferredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'preferred'
    const [savedJobs, setSavedJobs] = useState(new Set());

    useEffect(() => {
        const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                await loadProfileData(currentUser.uid);
            } else {
                // For demo purposes, create a mock user
                const mockUser = {
                    uid: params.id,
                    email: `${params.id}@example.com`,
                    displayName: getDisplayName()
                };
                setUser(mockUser);
                await loadProfileData(mockUser.uid);
            }
        });

        return () => authUnsubscribe();
    }, [params.id]);

    useEffect(() => {
        if (profileData) {
            loadJobs();
            loadPreferredJobs();
        }
    }, [profileData, searchQuery, locationQuery, currentPage]);

    // Load jobs immediately on component mount, even without profile data
    useEffect(() => {
        loadJobs();
    }, []);

    const loadProfileData = async (userId) => {
        try {
            console.log('📊 Loading profile data for user:', userId);
            
            // Try to load from Firebase first
            const docRef = doc(db, 'userProfiles', userId);
            const docSnap = await getDoc(docRef);

            let userData;
            if (docSnap.exists()) {
                userData = docSnap.data();
                console.log('✅ Profile data loaded from Firebase:', userData);
            } else {
                // Fallback to mock data
                userData = {
                    displayName: getDisplayName(),
                    email: `${userId}@example.com`,
                    skills: ['JavaScript', 'React', 'Node.js'],
                    preferredJobLocations: ['San Francisco', 'Remote'],
                    preferredJobRoles: ['Software Engineer', 'Frontend Developer'],
                };
                console.log('📝 Using mock profile data');
            }
            
            setProfileData(userData);
        } catch (error) {
            console.error('Error loading profile data:', error);
            // Use mock data as fallback
            setProfileData({
                displayName: getDisplayName(),
                email: `${params.id}@example.com`,
                skills: ['JavaScript', 'React', 'Node.js'],
                preferredJobLocations: ['San Francisco', 'Remote'],
                preferredJobRoles: ['Software Engineer', 'Frontend Developer'],
            });
        }
    };

    const loadJobs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '10'
            });

            if (searchQuery) params.append('query', searchQuery);
            if (locationQuery) params.append('location', locationQuery);

            const response = await fetch(`/api/jobs?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                setJobs(result.data.jobs || []);
                setTotalPages(result.data.totalPages || 1);
                
                if (result.fallback) {
                    console.log('ℹ️ Using fallback jobs:', result.message);
                } else if (result.data.jobs.length === 0) {
                    console.log('ℹ️ No jobs found for current search criteria');
                }
            } else {
                console.error('Failed to load jobs:', result.error);
                console.error('Error details:', result);
                setJobs([]);
                
                // Show specific error message based on the error type
                let errorMessage = 'Failed to load jobs. ';
                if (result.status === 403) {
                    errorMessage += 'API access denied. Please check API key.';
                } else if (result.status === 429) {
                    errorMessage += 'Too many requests. Please try again in a moment.';
                } else if (result.status >= 500) {
                    errorMessage += 'Server error. Please try again later.';
                } else {
                    errorMessage += result.message || 'Please try again later.';
                }
                
                alert(errorMessage);
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
            setJobs([]);
            alert('Error loading jobs. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadPreferredJobs = async () => {
        if (!profileData?.preferredJobRoles?.length && !profileData?.preferredJobLocations?.length) {
            setPreferredJobs([]);
            return;
        }

        try {
            // Build query based on user preferences
            const roleQuery = profileData.preferredJobRoles?.join(' OR ') || '';
            const locationQuery = profileData.preferredJobLocations?.join(' OR ') || '';

            const params = new URLSearchParams({
                page: '1',
                limit: '20'
            });

            if (roleQuery) params.append('query', roleQuery);
            if (locationQuery) params.append('location', locationQuery);

            const response = await fetch(`/api/jobs?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                // Filter and sort by relevance to user preferences
                const filtered = result.data.jobs.filter(job => {
                    const matchesRole = !profileData.preferredJobRoles?.length || 
                        profileData.preferredJobRoles.some(role => 
                            job.title.toLowerCase().includes(role.toLowerCase())
                        );
                    
                    const matchesLocation = !profileData.preferredJobLocations?.length ||
                        profileData.preferredJobLocations.some(location => 
                            job.location.toLowerCase().includes(location.toLowerCase()) ||
                            (location.toLowerCase() === 'remote' && job.remote)
                        );

                    return matchesRole || matchesLocation;
                });

                setPreferredJobs(filtered.slice(0, 10));
            } else {
                console.error('Failed to load preferred jobs:', result.error);
                setPreferredJobs([]);
            }
        } catch (error) {
            console.error('Error loading preferred jobs:', error);
            setPreferredJobs([]);
        }
    };

    const getDisplayName = () => {
        if (profileData?.displayName) {
            return profileData.displayName;
        }
        if (params.id) {
            const urlName = params.id.toString();
            if (urlName.includes('-')) {
                return urlName.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
            }
            return urlName.charAt(0).toUpperCase() + urlName.slice(1);
        }
        return 'User';
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        loadJobs();
    };

    const toggleSaveJob = (jobId) => {
        const newSavedJobs = new Set(savedJobs);
        if (newSavedJobs.has(jobId)) {
            newSavedJobs.delete(jobId);
        } else {
            newSavedJobs.add(jobId);
        }
        setSavedJobs(newSavedJobs);
    };

    const getMatchScore = (job) => {
        if (!profileData) return 0;
        
        let score = 0;
        const userSkills = profileData.skills || [];
        const userRoles = profileData.preferredJobRoles || [];
        const userLocations = profileData.preferredJobLocations || [];

        // Skills match (40% weight)
        const skillMatches = job.skills.filter(skill => 
            userSkills.some(userSkill => 
                userSkill.toLowerCase().includes(skill.toLowerCase()) ||
                skill.toLowerCase().includes(userSkill.toLowerCase())
            )
        ).length;
        score += (skillMatches / Math.max(job.skills.length, 1)) * 40;

        // Role match (35% weight)
        const roleMatch = userRoles.some(role => 
            job.title.toLowerCase().includes(role.toLowerCase())
        );
        if (roleMatch) score += 35;

        // Location match (25% weight)
        const locationMatch = userLocations.some(location => 
            job.location.toLowerCase().includes(location.toLowerCase()) ||
            (location.toLowerCase() === 'remote' && job.remote)
        );
        if (locationMatch) score += 25;

        return Math.min(Math.round(score), 100);
    };

    const JobCard = ({ job, showMatchScore = false }) => {
        const matchScore = showMatchScore ? getMatchScore(job) : job.matchScore || 0;
        const isSaved = savedJobs.has(job.id);

        return (
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-800 hover:text-blue-600 cursor-pointer">
                                {job.title}
                            </h3>
                            {showMatchScore && matchScore > 0 && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    matchScore >= 80 ? 'bg-green-100 text-green-800' :
                                    matchScore >= 60 ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {matchScore}% Match
                                </span>
                            )}
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600 mb-2">
                            <Building size={16} />
                            <span className="font-medium">{job.company}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => toggleSaveJob(job.id)}
                        className={`p-2 rounded-full transition-colors ${
                            isSaved 
                                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                    >
                        <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center">
                        <MapPin size={14} className="mr-1" />
                        {job.location}
                        {job.remote && <span className="ml-1 text-green-600">(Remote)</span>}
                    </div>
                    <div className="flex items-center">
                        <Briefcase size={14} className="mr-1" />
                        {job.type}
                    </div>
                    <div className="flex items-center">
                        <DollarSign size={14} className="mr-1" />
                        {job.salary}
                    </div>
                    <div className="flex items-center">
                        <Clock size={14} className="mr-1" />
                        {job.experience}
                    </div>
                </div>

                <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                    {job.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                    {job.skills.slice(0, 5).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                            {skill}
                        </span>
                    ))}
                    {job.skills.length > 5 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                            +{job.skills.length - 5} more
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center text-sm text-gray-500">
                        <Calendar size={14} className="mr-1" />
                        Posted {new Date(job.postedDate).toLocaleDateString()}
                    </div>
                    <button 
                        onClick={() => job.applyUrl ? window.open(job.applyUrl, '_blank') : null}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-1"
                    >
                        <span>Apply Now</span>
                        <ExternalLink size={14} />
                    </button>
                </div>
            </div>
        );
    };

    if (loading && jobs.length === 0) {
        return (
            <div className="p-8 bg-gray-100 min-h-screen">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading jobs...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Job Opportunities</h1>
                    <p className="text-gray-600">Discover and apply to jobs that match your skills and preferences</p>
                </div>

                {/* Search Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Job title, skills, or company"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Location or 'Remote'"
                                    value={locationQuery}
                                    onChange={(e) => setLocationQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Search Jobs
                        </button>
                    </form>
                </div>

                {/* Tabs */}
                <div className="mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'all'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                All Jobs ({jobs.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('preferred')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 ${
                                    activeTab === 'preferred'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <Target size={16} />
                                <span>Recommended ({preferredJobs.length})</span>
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Job Listings */}
                <div className="grid grid-cols-1 gap-6">
                    {activeTab === 'all' ? (
                        jobs.length > 0 ? (
                            jobs.map((job) => (
                                <JobCard key={job.id} job={job} showMatchScore={true} />
                            ))
                        ) : (
                            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                                <Briefcase className="mx-auto text-gray-400 mb-4" size={48} />
                                <h3 className="text-lg font-medium text-gray-800 mb-2">
                                    {searchQuery || locationQuery ? 'No Jobs Found' : 'Loading Jobs...'}
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    {searchQuery || locationQuery 
                                        ? 'Try adjusting your search criteria or removing filters' 
                                        : 'We\'re fetching the latest job opportunities for you'
                                    }
                                </p>
                                {(searchQuery || locationQuery) && (
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <button
                                            onClick={() => {
                                                setSearchQuery('');
                                                setLocationQuery('');
                                                setCurrentPage(1);
                                            }}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Clear Filters
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSearchQuery('software engineer');
                                                setLocationQuery('');
                                                setCurrentPage(1);
                                            }}
                                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Search Popular Jobs
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        preferredJobs.length > 0 ? (
                            <>
                                {profileData?.preferredJobRoles?.length > 0 || profileData?.preferredJobLocations?.length > 0 ? (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                        <h3 className="text-sm font-medium text-blue-800 mb-2">Based on your preferences:</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {profileData.preferredJobRoles?.map((role, index) => (
                                                <span key={`role-${index}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                    <Briefcase size={12} className="mr-1" />
                                                    {role}
                                                </span>
                                            ))}
                                            {profileData.preferredJobLocations?.map((location, index) => (
                                                <span key={`location-${index}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <MapPin size={12} className="mr-1" />
                                                    {location}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                                {preferredJobs.map((job) => (
                                    <JobCard key={job.id} job={job} showMatchScore={true} />
                                ))}
                            </>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                                <Target className="mx-auto text-gray-400 mb-4" size={48} />
                                <h3 className="text-lg font-medium text-gray-800 mb-2">No Preferred Jobs Found</h3>
                                <p className="text-gray-600 mb-4">
                                    {!profileData?.preferredJobRoles?.length && !profileData?.preferredJobLocations?.length
                                        ? "Set your job preferences to see personalized recommendations"
                                        : "We couldn't find jobs matching your preferences. Try the 'All Jobs' tab."}
                                </p>
                                {!profileData?.preferredJobRoles?.length && !profileData?.preferredJobLocations?.length && (
                                    <button
                                        onClick={() => router.push(`/${params.id}/profile`)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Set Preferences
                                    </button>
                                )}
                            </div>
                        )
                    )}
                </div>

                {/* Pagination */}
                {activeTab === 'all' && totalPages > 1 && (
                    <div className="mt-8 flex justify-center">
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <span className="px-4 py-2 text-sm text-gray-600">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}