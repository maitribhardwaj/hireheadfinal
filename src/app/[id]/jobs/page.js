"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "../../../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
    IconSearch, IconMapPin, IconBriefcase, IconCalendar, IconCurrencyDollar,
    IconFilter, IconStar, IconExternalLink, IconClock, IconBuilding,
    IconTarget, IconTrendingUp, IconHeart, IconArrowRight, IconChevronDown,
    IconUsers, IconAward, IconCircleCheck
} from "@tabler/icons-react";

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
        if (!profileData) return { score: 0, details: {} };
        
        const userSkills = profileData.skills || [];
        const userRoles = profileData.preferredJobRoles || [];
        const userLocations = profileData.preferredJobLocations || [];
        const userEducation = profileData.education || [];

        // Skills match (40% weight)
        const matchedSkills = job.skills.filter(skill => 
            userSkills.some(userSkill => 
                userSkill.toLowerCase().includes(skill.toLowerCase()) ||
                skill.toLowerCase().includes(userSkill.toLowerCase())
            )
        );
        const missingSkills = job.skills.filter(skill => 
            !userSkills.some(userSkill => 
                userSkill.toLowerCase().includes(skill.toLowerCase()) ||
                skill.toLowerCase().includes(userSkill.toLowerCase())
            )
        );
        const skillScore = (matchedSkills.length / Math.max(job.skills.length, 1)) * 40;

        // Role match (35% weight)
        const roleMatch = userRoles.some(role => 
            job.title.toLowerCase().includes(role.toLowerCase())
        );
        const roleScore = roleMatch ? 35 : 0;

        // Location match (25% weight)
        const locationMatch = userLocations.some(location => 
            job.location.toLowerCase().includes(location.toLowerCase()) ||
            (location.toLowerCase() === 'remote' && job.remote)
        );
        const locationScore = locationMatch ? 25 : 0;

        const totalScore = Math.min(Math.round(skillScore + roleScore + locationScore), 100);

        return {
            score: totalScore,
            details: {
                skillsMatch: {
                    matched: matchedSkills,
                    missing: missingSkills,
                    percentage: Math.round((matchedSkills.length / Math.max(job.skills.length, 1)) * 100)
                },
                roleMatch: roleMatch,
                locationMatch: locationMatch,
                breakdown: {
                    skills: Math.round(skillScore),
                    role: roleScore,
                    location: locationScore
                }
            }
        };
    };

    const JobCard = ({ job, showMatchScore = false }) => {
        const matchData = showMatchScore ? getMatchScore(job) : { score: job.matchScore || 0, details: {} };
        const isSaved = savedJobs.has(job.id);
        const [showDetails, setShowDetails] = useState(null); // 'skills', 'role', 'location', or null

        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                {/* Compact Header */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900 truncate cursor-pointer">
                                {job.title}
                            </h3>
                            {showMatchScore && matchData.score > 0 && (
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                                    matchData.score >= 80 ? 'bg-green-100 text-green-800' :
                                    matchData.score >= 60 ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {matchData.score}%
                                </span>
                            )}
                        </div>
                        <div className="flex items-center text-xs text-gray-600 mb-2">
                            <IconBuilding size={12} className="mr-1 flex-shrink-0" />
                            <span className="truncate">{job.company}</span>
                            <span className="mx-1">•</span>
                            <IconMapPin size={12} className="flex-shrink-0" />
                            <span className="truncate">{job.location}</span>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => toggleSaveJob(job.id)}
                        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                            isSaved 
                                ? 'bg-red-100 text-red-600' 
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                    >
                        <IconHeart size={14} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                </div>

                {/* Compact Job Details */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-1.5 bg-gray-50 rounded">
                        <p className="text-xs text-gray-600">Salary</p>
                        <p className="text-xs font-medium text-gray-900 truncate">{job.salary}</p>
                    </div>
                    <div className="text-center p-1.5 bg-gray-50 rounded">
                        <p className="text-xs text-gray-600">Type</p>
                        <p className="text-xs font-medium text-gray-900">{job.type}</p>
                    </div>
                    <div className="text-center p-1.5 bg-gray-50 rounded">
                        <p className="text-xs text-gray-600">Exp</p>
                        <p className="text-xs font-medium text-gray-900">{job.experience}</p>
                    </div>
                </div>

                {/* Compact Match Analysis */}
                {showMatchScore && matchData.details && (
                    <div className="mb-3 p-2 bg-pink-50 rounded border border-blue-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium text-blue-900">Match Analysis</span>
                            <div className="flex gap-1 text-xs">
                                <button 
                                    className={`px-2 py-1 rounded hover:bg-white/50 transition-colors ${matchData.details.breakdown?.skills > 0 ? 'text-green-600' : 'text-gray-500'} ${showDetails === 'skills' ? 'bg-white shadow-sm' : ''}`}
                                    onClick={() => setShowDetails(showDetails === 'skills' ? null : 'skills')}
                                    title="Click to see skills breakdown"
                                >
                                    Skill Match: {matchData.details.breakdown?.skills || 0}%
                                </button>
                                <button 
                                    className={`px-2 py-1 rounded hover:bg-white/50 transition-colors ${matchData.details.roleMatch ? 'text-green-600' : 'text-gray-500'} ${showDetails === 'role' ? 'bg-white shadow-sm' : ''}`}
                                    onClick={() => setShowDetails(showDetails === 'role' ? null : 'role')}
                                    title="Click to see role match details"
                                >
                                    Role: {matchData.details.roleMatch ? 'Yes' : 'No'}
                                </button>
                                <button 
                                    className={`px-2 py-1 rounded hover:bg-white/50 transition-colors ${matchData.details.locationMatch ? 'text-green-600' : 'text-gray-500'} ${showDetails === 'location' ? 'bg-white shadow-sm' : ''}`}
                                    onClick={() => setShowDetails(showDetails === 'location' ? null : 'location')}
                                    title="Click to see location match details"
                                >
                                    Location: {matchData.details.locationMatch ? 'Yes' : 'No'}
                                </button>
                            </div>
                        </div>

                        {/* Detailed Information Display */}
                        {showDetails === 'skills' && (
                            <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                                <h4 className="text-xs font-semibold text-blue-900 mb-2">Skill Match Breakdown</h4>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-xs text-green-700 font-medium">You Have ({matchData.details.skillsMatch?.matched.length || 0}):</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {matchData.details.skillsMatch?.matched.map((skill, index) => (
                                                <span key={index} className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                                    {skill}
                                                </span>
                                            )) || <span className="text-xs text-gray-500">None</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-orange-700 font-medium">Missing ({matchData.details.skillsMatch?.missing.length || 0}):</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {matchData.details.skillsMatch?.missing.map((skill, index) => (
                                                <span key={index} className="px-1.5 py-0.5 bg-orange-100 text-orange-800 text-xs rounded">
                                                    {skill}
                                                </span>
                                            )) || <span className="text-xs text-gray-500">None</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showDetails === 'role' && (
                            <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                                <h4 className="text-xs font-semibold text-blue-900 mb-2">Role Match Details</h4>
                                <div className="space-y-1">
                                    <p className="text-xs"><span className="font-medium">Job Title:</span> {job.title}</p>
                                    <p className="text-xs"><span className="font-medium">Your Preferred Roles:</span> {profileData?.preferredJobRoles?.join(', ') || 'None set'}</p>
                                    <p className={`text-xs font-medium ${matchData.details.roleMatch ? 'text-green-700' : 'text-red-700'}`}>
                                        {matchData.details.roleMatch ? 'Yes - This job matches your preferred roles' : 'No - This job doesn\'t match your preferred roles'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {showDetails === 'location' && (
                            <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                                <h4 className="text-xs font-semibold text-blue-900 mb-2">Location Match Details</h4>
                                <div className="space-y-1">
                                    <p className="text-xs"><span className="font-medium">Job Location:</span> {job.location}</p>
                                    <p className="text-xs"><span className="font-medium">Remote Available:</span> {job.remote ? 'Yes' : 'No'}</p>
                                    <p className="text-xs"><span className="font-medium">Your Preferred Locations:</span> {profileData?.preferredJobLocations?.join(', ') || 'None set'}</p>
                                    <p className={`text-xs font-medium ${matchData.details.locationMatch ? 'text-green-700' : 'text-red-700'}`}>
                                        {matchData.details.locationMatch ? 'Yes - This location matches your preferences' : 'No - This location doesn\'t match your preferences'}
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {/* Compact Skills Display */}
                        {matchData.details.skillsMatch && showDetails !== 'skills' && (
                            <div className="space-y-1">
                                {matchData.details.skillsMatch.matched.length > 0 && (
                                    <div>
                                        <p className="text-xs text-green-700 mb-1">
                                            ✓ Have ({matchData.details.skillsMatch.matched.length}):
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {matchData.details.skillsMatch.matched.slice(0, 3).map((skill, index) => (
                                                <span key={index} className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                                    {skill}
                                                </span>
                                            ))}
                                            {matchData.details.skillsMatch.matched.length > 3 && (
                                                <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                                    +{matchData.details.skillsMatch.matched.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {matchData.details.skillsMatch.missing.length > 0 && (
                                    <div>
                                        <p className="text-xs text-orange-700 mb-1">
                                            ⚠ Need ({matchData.details.skillsMatch.missing.length}):
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {matchData.details.skillsMatch.missing.slice(0, 3).map((skill, index) => (
                                                <span key={index} className="px-1.5 py-0.5 bg-orange-100 text-orange-800 text-xs rounded">
                                                    {skill}
                                                </span>
                                            ))}
                                            {matchData.details.skillsMatch.missing.length > 3 && (
                                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 text-xs rounded">
                                                    +{matchData.details.skillsMatch.missing.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Compact Skills */}
                <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Skills Required:</p>
                    <div className="flex flex-wrap gap-1">
                        {job.skills.slice(0, 4).map((skill, index) => {
                            const isMatched = matchData.details.skillsMatch?.matched.includes(skill);
                            return (
                                <span 
                                    key={index} 
                                    className={`px-1.5 py-0.5 text-xs rounded ${
                                        isMatched 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    {skill}
                                </span>
                            );
                        })}
                        {job.skills.length > 4 && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                +{job.skills.length - 4}
                            </span>
                        )}
                    </div>
                </div>

                {/* Compact Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center text-xs text-gray-500">
                        <span className="mr-1">Posted:</span>
                        {new Date(job.postedDate).toLocaleDateString()}
                    </div>
                    <button 
                        onClick={() => job.applyUrl ? window.open(job.applyUrl, '_blank') : null}
                        className="bg-pink-400 text-white px-3 py-1.5 rounded-lg hover:bg-pink-500 transition-colors text-xs font-medium flex items-center space-x-1"
                    >
                        <span>Apply</span>
                        <IconExternalLink size={12} />
                    </button>
                </div>
            </div>
        );
    };

    if (loading && jobs.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Modern Header */}
            <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-pink-300 from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                            <IconBriefcase className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                Job Opportunities for {getDisplayName()}
                            </h1>
                            <p className="text-gray-600">Discover and apply to jobs that match your skills and preferences</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Compact Search Section */}
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/40 p-6 mb-6">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                        {/* Job Search Input */}
                        <div className="flex-1">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                    <IconSearch className="text-gray-400" size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Job title, skills, or company..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-200 text-gray-900"
                                />
                            </div>
                        </div>

                        {/* Location Input */}
                        <div className="flex-1">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                    <IconMapPin className="text-gray-400" size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Location or 'Remote'..."
                                    value={locationQuery}
                                    onChange={(e) => setLocationQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-200 text-gray-900"
                                />
                            </div>
                        </div>

                        {/* Search Button */}
                        <button
                            type="submit"
                            className="bg-pink-400 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2"
                        >
                            <IconSearch size={16} />
                            <span>Search</span>
                        </button>
                    </form>

                    {/* Quick Search Tags */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                        <span className="text-xs text-gray-600 font-medium">Popular:</span>
                        {['Software Engineer', 'Product Manager', 'Remote Jobs'].map((term, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => {
                                    setSearchQuery(term);
                                    handleSearch({ preventDefault: () => {} });
                                }}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-blue-100 hover:text-blue-700 transition-colors"
                            >
                                {term}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Enhanced Tabs */}
                <div className="mb-8">
                    <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/40 p-2">
                        <nav className="flex space-x-2">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`relative flex-1 py-4 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${
                                    activeTab === 'all'
                                        ? 'bg-pink-300 text-white shadow-lg transform scale-105'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                }`}
                            >
                                <div className="flex items-center justify-center space-x-2">
                                    <IconBriefcase size={18} />
                                    <span>All Jobs</span>
                                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        activeTab === 'all' 
                                            ? 'bg-white/20 text-white' 
                                            : 'bg-gray-200 text-gray-600'
                                    }`}>
                                        {jobs.length}
                                    </div>
                                </div>
                                {activeTab === 'all' && (
                                    <div className="absolute -inset-1 bg-pink-300 rounded-xl opacity-20 blur-lg"></div>
                                )}
                            </button>
                            
                            <button
                                onClick={() => setActiveTab('preferred')}
                                className={`relative flex-1 py-4 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${
                                    activeTab === 'preferred'
                                        ? 'bg-pink-300 text-white shadow-lg transform scale-105'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                }`}
                            >
                                <div className="flex items-center justify-center space-x-2">
                                    <IconTarget size={18} />
                                    <span>Recommended</span>
                                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        activeTab === 'preferred' 
                                            ? 'bg-white/20 text-black' 
                                            : 'bg-gray-200 text-gray-600'
                                    }`}>
                                        {preferredJobs.length}
                                    </div>
                                </div>
                                {activeTab === 'preferred' && (
                                    <div className="absolute -inset-1 bg-pink-300 rounded-xl opacity-20 blur-lg"></div>
                                )}
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Job Listings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeTab === 'all' ? (
                        jobs.length > 0 ? (
                            jobs.map((job) => (
                                <JobCard key={job.id} job={job} showMatchScore={true} />
                            ))
                        ) : (
                            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                                <IconBriefcase className="mx-auto text-gray-400 mb-4" size={48} />
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
                                            className="bg-pink-600 text-black px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
                                                    <IconBriefcase size={12} className="mr-1" />
                                                    {role}
                                                </span>
                                            ))}
                                            {profileData.preferredJobLocations?.map((location, index) => (
                                                <span key={`location-${index}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <IconMapPin size={12} className="mr-1" />
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
                                <IconTarget className="mx-auto text-gray-400 mb-4" size={48} />
                                <h3 className="text-lg font-medium text-gray-800 mb-2">No Preferred Jobs Found</h3>
                                <p className="text-gray-600 mb-4">
                                    {!profileData?.preferredJobRoles?.length && !profileData?.preferredJobLocations?.length
                                        ? "Set your job preferences to see personalized recommendations"
                                        : "We couldn't find jobs matching your preferences. Try the 'All Jobs' tab."}
                                </p>
                                {!profileData?.preferredJobRoles?.length && !profileData?.preferredJobLocations?.length && (
                                    <button
                                        onClick={() => router.push(`/${params.id}/profile`)}
                                        className="bg-pink-300 text-white px-4 py-2 rounded-lg transition-colors"
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