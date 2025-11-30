"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
// Firebase imports - loaded dynamically to avoid SSR issues
import { 
    IconUser, IconCircleCheck, IconAlertCircle, IconTrendingUp, 
    IconCalendar, IconMapPin, IconMail, IconPhone, IconAward, 
    IconBook, IconBriefcase, IconExternalLink, IconArrowRight,
    IconFileText, IconChartBar, IconTarget
} from "@tabler/icons-react";

export default function DashboardPage() {
    const params = useParams();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [profileCompletion, setProfileCompletion] = useState(0);
    const [resumeData, setResumeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [jobRecommendations, setJobRecommendations] = useState([]);
    const [resumeLoading, setResumeLoading] = useState(false);

    useEffect(() => {
        const initializeUser = async () => {
            try {
                // Try to use Firebase auth if available
                const { auth } = await import("../../config/firebase");
                const { onAuthStateChanged } = await import("firebase/auth");
                
                const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                    if (currentUser) {
                        console.log('✅ Firebase user authenticated:', currentUser.uid);
                        setUser(currentUser);
                        
                        // Load data for authenticated user
                        Promise.all([
                            loadProfileData(currentUser.uid),
                            loadResumeData(currentUser.uid)
                        ]).finally(() => {
                            setLoading(false);
                        });
                    } else {
                        // No authenticated user, use params.id as fallback
                        console.log('📝 No Firebase user, using URL parameter:', params.id);
                        const mockUser = {
                            uid: params.id,
                            email: `${params.id}@example.com`,
                            displayName: getDisplayName()
                        };
                        
                        setUser(mockUser);
                        
                        Promise.all([
                            loadProfileData(mockUser.uid),
                            loadResumeData(mockUser.uid)
                        ]).finally(() => {
                            setLoading(false);
                        });
                    }
                });
                
                // Cleanup function
                return () => unsubscribe();
            } catch (firebaseError) {
                console.log('⚠️ Firebase not available, using fallback authentication:', firebaseError.message);
                
                // Fallback to mock user
                const mockUser = {
                    uid: params.id,
                    email: `${params.id}@example.com`,
                    displayName: getDisplayName()
                };
                
                setUser(mockUser);
                
                Promise.all([
                    loadProfileData(mockUser.uid),
                    loadResumeData(mockUser.uid)
                ]).finally(() => {
                    setLoading(false);
                });
            }
        };
        
        initializeUser();
    }, [params.id]);

    const loadProfileData = async (userId) => {
        try {
            console.log('📊 Loading profile data for user:', userId);
            
            // Try to load real profile data from Firebase
            let profileData = null;
            
            try {
                // Import Firebase modules dynamically to avoid SSR issues
                const { auth, db } = await import("../../config/firebase");
                const { doc, getDoc } = await import("firebase/firestore");
                
                const docRef = doc(db, 'userProfiles', userId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    profileData = docSnap.data();
                    console.log('✅ Real profile data loaded from Firebase:', profileData);
                } else {
                    console.log('📝 No profile document found in Firebase');
                }
            } catch (firebaseError) {
                console.log('⚠️ Firebase not available, using fallback data:', firebaseError.message);
            }
            
            // Use real data if available, otherwise use default structure
            const finalProfileData = profileData || {
                displayName: getDisplayName(),
                email: `${userId}@example.com`,
                phone: '',
                location: '',
                profileSummary: '',
                skills: [],
                education: [],
                certifications: [],
                preferredJobLocations: [],
                preferredJobRoles: [],
                socialLinks: {
                    linkedin: '',
                    github: '',
                    website: ''
                }
            };
            
            // Ensure all required fields exist
            const completeProfileData = {
                displayName: finalProfileData.displayName || getDisplayName(),
                email: finalProfileData.email || `${userId}@example.com`,
                phone: finalProfileData.phone || '',
                location: finalProfileData.location || '',
                profileSummary: finalProfileData.profileSummary || '',
                skills: finalProfileData.skills || [],
                education: finalProfileData.education || [],
                certifications: finalProfileData.certifications || [],
                preferredJobLocations: finalProfileData.preferredJobLocations || [],
                preferredJobRoles: finalProfileData.preferredJobRoles || [],
                socialLinks: finalProfileData.socialLinks || {
                    linkedin: '',
                    github: '',
                    website: ''
                },
                updatedAt: finalProfileData.updatedAt
            };
            
            console.log('📋 Final profile data:', {
                hasPreferences: !!(completeProfileData.preferredJobRoles?.length || completeProfileData.preferredJobLocations?.length),
                jobRoles: completeProfileData.preferredJobRoles,
                jobLocations: completeProfileData.preferredJobLocations,
                skillsCount: completeProfileData.skills?.length || 0
            });
            
            setProfileData(completeProfileData);
            calculateProfileCompletion(completeProfileData);
            
            // Generate job recommendations based on real profile
            const recommendations = await generateJobRecommendations(completeProfileData);
            setJobRecommendations(recommendations);
        } catch (error) {
            console.error('Error loading profile data:', error);
            
            // Fallback to basic structure
            const fallbackData = {
                displayName: getDisplayName(),
                email: `${params.id}@example.com`,
                phone: '',
                location: '',
                profileSummary: '',
                skills: [],
                education: [],
                certifications: [],
                preferredJobLocations: [],
                preferredJobRoles: [],
                socialLinks: {
                    linkedin: '',
                    github: '',
                    website: ''
                }
            };
            
            setProfileData(fallbackData);
            calculateProfileCompletion(fallbackData);
        }
    };

    const loadResumeData = async (userId) => {
        setResumeLoading(true);
        try {
            console.log('📊 Loading resume analysis for user:', userId);
            
            const response = await fetch(`/api/resume/get-analysis?userId=${userId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            console.log('📡 Resume API response:', {
                success: result.success,
                hasData: !!result.data,
                atsScore: result.data?.atsScore,
                fileName: result.data?.fileName,
                analysisDate: result.data?.analysisDate,
                error: result.error
            });
            
            if (result.success && result.data && result.data.atsScore) {
                setResumeData(result.data);
                console.log('✅ Loaded resume analysis with ATS score:', result.data.atsScore);
                console.log('📄 Resume file:', result.data.fileName);
                console.log('📅 Analysis date:', result.data.analysisDate);
            } else {
                setResumeData(null);
                console.log('📝 No valid resume analysis found:', result.error || 'Missing ATS score');
            }
        } catch (error) {
            console.error('❌ Error loading resume data:', error);
            setResumeData(null);
        } finally {
            setResumeLoading(false);
        }
    };

    // Function to refresh resume data (can be called after new analysis)
    const refreshResumeData = async () => {
        if (user?.uid) {
            await loadResumeData(user.uid);
        }
    };

    const calculateProfileCompletion = (data) => {
        if (!data) {
            setProfileCompletion(0);
            return;
        }

        const fields = [
            { key: 'displayName', weight: 10 },
            { key: 'email', weight: 10 },
            { key: 'phone', weight: 8 },
            { key: 'dateOfBirth', weight: 5 },
            { key: 'location', weight: 8 },
            { key: 'profileSummary', weight: 15 },
            { key: 'skills', weight: 15, isArray: true },
            { key: 'education', weight: 12, isArray: true },
            { key: 'certifications', weight: 7, isArray: true },
            { key: 'preferredJobLocations', weight: 5, isArray: true },
            { key: 'preferredJobRoles', weight: 5, isArray: true }
        ];

        const socialLinksWeight = 10;
        let totalWeight = fields.reduce((sum, field) => sum + field.weight, 0) + socialLinksWeight;
        let completedWeight = 0;

        // Check basic fields
        fields.forEach(field => {
            if (field.isArray) {
                if (data[field.key] && Array.isArray(data[field.key]) && data[field.key].length > 0) {
                    completedWeight += field.weight;
                }
            } else {
                if (data[field.key] && data[field.key].toString().trim() !== '') {
                    completedWeight += field.weight;
                }
            }
        });

        // Check social links
        const socialLinks = data.socialLinks || {};
        const socialCount = Object.values(socialLinks).filter(link => link && link.trim() !== '').length;
        if (socialCount > 0) {
            completedWeight += (socialCount / 3) * socialLinksWeight; // 3 social links max
        }

        const percentage = Math.round((completedWeight / totalWeight) * 100);
        console.log('📊 Profile completion calculation:', {
            completedWeight,
            totalWeight,
            percentage,
            fields: fields.map(field => ({
                key: field.key,
                filled: field.isArray ? 
                    (data[field.key] && Array.isArray(data[field.key]) && data[field.key].length > 0) :
                    (data[field.key] && data[field.key].toString().trim() !== ''),
                weight: field.weight
            })),
            socialLinks: socialCount
        });
        setProfileCompletion(Math.min(100, percentage));
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

    const getCompletionColor = (percentage) => {
        if (percentage >= 80) return 'text-green-600';
        if (percentage >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getCompletionBgColor = (percentage) => {
        if (percentage >= 80) return 'bg-green-100';
        if (percentage >= 50) return 'bg-yellow-100';
        return 'bg-red-100';
    };

    const getATSScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getATSScoreBgColor = (score) => {
        if (score >= 80) return 'bg-green-100';
        if (score >= 60) return 'bg-yellow-100';
        return 'bg-red-100';
    };

    const getATSScoreLabel = (score) => {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        return 'Needs Work';
    };

    const getMissingFields = () => {
        if (!profileData) {
            return ['Complete your profile to get started'];
        }

        const missing = [];
        if (!profileData.displayName) missing.push('Display Name');
        if (!profileData.phone) missing.push('Phone Number');
        if (!profileData.location) missing.push('Location');
        if (!profileData.profileSummary) missing.push('Profile Summary');
        if (!profileData.skills || profileData.skills.length === 0) missing.push('Skills');
        if (!profileData.education || profileData.education.length === 0) missing.push('Education');
        if (!profileData.certifications || profileData.certifications.length === 0) missing.push('Certifications');
        if (!profileData.preferredJobLocations || profileData.preferredJobLocations.length === 0) missing.push('Preferred Job Locations');
        if (!profileData.preferredJobRoles || profileData.preferredJobRoles.length === 0) missing.push('Preferred Job Roles');
        
        const socialLinks = profileData.socialLinks || {};
        const socialCount = Object.values(socialLinks).filter(link => link && link.trim() !== '').length;
        if (socialCount === 0) missing.push('Social Links');

        return missing;
    };

    const generateJobRecommendations = async (profileData) => {
        try {
            if (!profileData || (!profileData.preferredJobRoles?.length && !profileData.preferredJobLocations?.length)) {
                // If no preferences, fetch general software jobs
                const response = await fetch('/api/jobs?query=software engineer&limit=3');
                const result = await response.json();
                return result.success ? result.data.jobs : [];
            }

            // Build query based on user preferences
            const roleQuery = profileData.preferredJobRoles?.join(' OR ') || 'software engineer';
            const locationQuery = profileData.preferredJobLocations?.join(' OR ') || '';

            const params = new URLSearchParams({
                query: roleQuery,
                limit: '4'
            });

            if (locationQuery) {
                params.append('location', locationQuery);
            }

            const response = await fetch(`/api/jobs?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                return result.data.jobs || [];
            } else {
                console.error('Failed to fetch job recommendations:', result.error);
                return [];
            }
        } catch (error) {
            console.error('Error generating job recommendations:', error);
            return [];
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading dashboard...</p>
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
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
                            <IconUser className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                Welcome {getDisplayName()}
                            </h1>
                            <p className="text-gray-600">Here's your career development overview</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Key Metrics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl transform rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                        <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-blue-100/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">Profile Completion</p>
                                    <p className={`text-2xl font-bold ${getCompletionColor(profileCompletion)}`}>
                                        {profileCompletion}%
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-blue-300 rounded-xl flex items-center justify-center shadow-lg">
                                    <IconUser className="text-white" size={20} />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-2xl transform -rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                        <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-emerald-100/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">ATS Score</p>
                                    <p className={`text-2xl font-bold ${resumeData ? getATSScoreColor(resumeData.atsScore) : 'text-gray-400'}`}>
                                        {resumeLoading ? '...' : resumeData ? `${resumeData.atsScore}%` : 'No Resume'}
                                    </p>
                                    {!resumeData && !resumeLoading && (
                                        <button
                                            onClick={() => router.push(`/${params.id}/resume`)}
                                            className="text-xs text-emerald-600 hover:underline mt-1"
                                        >
                                            Upload now
                                        </button>
                                    )}
                                </div>
                                <div className="w-12 h-12 bg-green-300 rounded-xl flex items-center justify-center shadow-lg">
                                    <IconFileText className="text-white" size={20} />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl transform rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                        <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-purple-100/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">Job Matches</p>
                                    <p className="text-2xl font-bold text-purple-600">
                                        {jobRecommendations.length}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-pink-300 rounded-xl flex items-center justify-center shadow-lg">
                                    <IconBriefcase className="text-white" size={20} />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-2xl transform -rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                        <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-orange-100/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">Skills Listed</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                        {profileData?.skills?.length || 0}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-orange-300 rounded-xl flex items-center justify-center shadow-lg">
                                    <IconTarget className="text-white" size={20} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>



                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Compact Profile Completion Card */}
                        <div className="bg-gradient-to-br from-white to-blue-50/30 backdrop-blur-xl rounded-3xl shadow-xl border border-blue-100/50 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full -translate-y-12 translate-x-12"></div>
                            <div className="relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                                            <IconUser className="text-white" size={16} />
                                        </div>
                                        <h2 className="text-lg font-bold text-gray-800">Profile Completion</h2>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${getCompletionBgColor(profileCompletion)} ${getCompletionColor(profileCompletion)}`}>
                                        {profileCompletion}%
                                    </div>
                                </div>

                                {/* Compact Progress Display */}
                                <div className="flex items-center space-x-4">
                                    <div className="relative w-20 h-20 flex-shrink-0">
                                        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                stroke="currentColor"
                                                strokeWidth="8"
                                                fill="transparent"
                                                className="text-gray-200"
                                            />
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                stroke="currentColor"
                                                strokeWidth="8"
                                                fill="transparent"
                                                strokeDasharray={`${2 * Math.PI * 40}`}
                                                strokeDashoffset={`${2 * Math.PI * 40 * (1 - profileCompletion / 100)}`}
                                                className={`transition-all duration-1000 ${
                                                    profileCompletion >= 80 ? 'text-green-500' :
                                                    profileCompletion >= 50 ? 'text-yellow-500' : 'text-red-500'
                                                }`}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className={`text-xl font-bold ${getCompletionColor(profileCompletion)}`}>
                                                    {profileCompletion}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="text-center p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-blue-100/50">
                                                <div className="text-xs text-gray-600">Skills</div>
                                                <div className="text-sm font-bold text-blue-600">{profileData?.skills?.length || 0}</div>
                                            </div>
                                            <div className="text-center p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-green-100/50">
                                                <div className="text-xs text-gray-600">Education</div>
                                                <div className="text-sm font-bold text-green-600">{profileData?.education?.length || 0}</div>
                                            </div>
                                            <div className="text-center p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-purple-100/50">
                                                <div className="text-xs text-gray-600">Certificates</div>
                                                <div className="text-sm font-bold text-purple-600">{profileData?.certifications?.length || 0}</div>
                                            </div>
                                            <div className="text-center p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-orange-100/50">
                                                <div className="text-xs text-gray-600">Preferences</div>
                                                <div className="text-sm font-bold text-orange-600">{(profileData?.preferredJobRoles?.length || 0) + (profileData?.preferredJobLocations?.length || 0)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Missing Fields */}
                            {profileCompletion < 100 && (
                                <div className="mt-6 pt-4 border-t border-gray-100">
                                    <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                                        <IconAlertCircle className="mr-2 text-yellow-500" size={16} />
                                        Complete Your Profile
                                    </h3>
                                    <div className="space-y-2 mb-4">
                                        {getMissingFields().slice(0, 2).map((field, index) => (
                                            <div key={index} className="flex items-center text-sm text-gray-600">
                                                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                                                Add {field}
                                            </div>
                                        ))}
                                        {getMissingFields().length > 2 && (
                                            <div className="text-sm text-gray-500">
                                                +{getMissingFields().length - 2} more fields
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => router.push(`/${params.id}/profile`)}
                                        className="bg-black text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 text-sm font-medium"
                                    >
                                        <span>Complete Profile</span>
                                        <IconArrowRight size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Profile Complete */}
                            {profileCompletion === 100 && (
                                <div className="mt-6 pt-4 border-t border-gray-100">
                                    <div className="flex items-center text-green-600 mb-2">
                                        <IconCircleCheck className="mr-2" size={16} />
                                        <span className="font-medium">Profile Complete!</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Your profile is fully optimized for better job matching.
                                    </p>
                                    <button
                                        onClick={() => router.push(`/${params.id}/profile`)}
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center space-x-2 text-sm font-medium"
                                    >
                                        <span>View Profile</span>
                                        <IconExternalLink size={14} />
                                    </button>
                                </div>
                            )}
                        </div>


                        {/* Enhanced ATS Resume Score Card */}
                        <div className="bg-gradient-to-br from-white to-emerald-50/30 backdrop-blur-xl rounded-3xl shadow-xl border border-emerald-100/50 p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/10 to-green-400/10 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="relative">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                                            <IconFileText className="text-white" size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-800">Resume ATS Score</h2>
                                            {resumeLoading && (
                                                <div className="flex items-center mt-1">
                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-600 mr-2"></div>
                                                    <span className="text-xs text-gray-500">Analyzing...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        {resumeData && (
                                            <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${getATSScoreBgColor(resumeData.atsScore)} ${getATSScoreColor(resumeData.atsScore)}`}>
                                                {getATSScoreLabel(resumeData.atsScore)}
                                            </div>
                                        )}
                                        <button
                                            onClick={refreshResumeData}
                                            disabled={resumeLoading}
                                            className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50"
                                            title="Refresh resume data"
                                        >
                                            <svg className={`w-4 h-4 ${resumeLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {resumeData ? (
                                <>
                                    {/* Enhanced ATS Score Display */}
                                    <div className="flex items-center justify-center mb-8">
                                        <div className="relative w-40 h-40">
                                            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    stroke="currentColor"
                                                    strokeWidth="6"
                                                    fill="transparent"
                                                    className="text-gray-200"
                                                />
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    stroke="currentColor"
                                                    strokeWidth="6"
                                                    fill="transparent"
                                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - resumeData.atsScore / 100)}`}
                                                    className={`transition-all duration-1000 ${
                                                        resumeData.atsScore >= 80 ? 'text-green-500' :
                                                        resumeData.atsScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                                                    }`}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="text-center">
                                                    <div className={`text-4xl font-bold ${getATSScoreColor(resumeData.atsScore)}`}>
                                                        {resumeData.atsScore}%
                                                    </div>
                                                    <div className="text-sm text-gray-500 font-medium">ATS Score</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Enhanced Score Breakdown */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                        <div className="group relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10 rounded-xl"></div>
                                            <div className="relative text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-blue-100/50 hover:shadow-lg transition-all duration-300">
                                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                                                    <IconChartBar className="text-white" size={16} />
                                                </div>
                                                <div className="text-sm font-semibold text-gray-800">Format</div>
                                                <div className="text-xl font-bold text-blue-600">
                                                    {resumeData.formatScore || 0}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="group relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/10 rounded-xl"></div>
                                            <div className="relative text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-green-100/50 hover:shadow-lg transition-all duration-300">
                                                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                                                    <IconTarget className="text-white" size={16} />
                                                </div>
                                                <div className="text-sm font-semibold text-gray-800">Content</div>
                                                <div className="text-xl font-bold text-green-600">
                                                    {resumeData.contentScore || 0}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="group relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/10 rounded-xl"></div>
                                            <div className="relative text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-purple-100/50 hover:shadow-lg transition-all duration-300">
                                                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                                                    <IconBook className="text-white" size={16} />
                                                </div>
                                                <div className="text-sm font-semibold text-gray-800">Keywords</div>
                                                <div className="text-xl font-bold text-purple-600">
                                                    {resumeData.keywordScore || 0}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Enhanced Resume Info */}
                                    <div className="border-t border-gray-100 pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-100/50">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <IconCalendar className="text-blue-600" size={14} />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">Last Analysis</span>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    {new Date(resumeData.analysisDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-100/50">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                                                        <IconFileText className="text-green-600" size={14} />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">Resume File</span>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    {resumeData.fileName || 'resume.pdf'}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Top Strengths */}
                                        {resumeData.strengths && resumeData.strengths.length > 0 && (
                                            <div className="mb-6">
                                                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                                                    <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center mr-2">
                                                        <IconCircleCheck className="text-emerald-600" size={14} />
                                                    </div>
                                                    Top Strengths
                                                </h4>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {resumeData.strengths.slice(0, 2).map((strength, index) => (
                                                        <div key={index} className="flex items-center p-3 bg-emerald-50/50 rounded-lg border border-emerald-100/50">
                                                            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                                                            <span className="text-sm text-emerald-700 font-medium">{strength}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Enhanced Action Buttons */}
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button
                                                onClick={() => router.push(`/${params.id}/resume`)}
                                                className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 flex items-center justify-center space-x-2 font-medium shadow-lg"
                                            >
                                                <span>View Full Analysis</span>
                                                <IconArrowRight size={16} />
                                            </button>
                                            <button
                                                onClick={() => router.push(`/${params.id}/resume`)}
                                                className="bg-white/80 backdrop-blur-sm text-gray-700 px-6 py-3 rounded-xl hover:bg-white transition-all duration-200 border border-gray-200/50 font-medium"
                                            >
                                                Upload New
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* No Resume Uploaded */
                                <div className="text-center py-8">
                                    <div className="relative w-32 h-32 mx-auto mb-6">
                                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                stroke="currentColor"
                                                strokeWidth="8"
                                                fill="transparent"
                                                className="text-gray-200"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <IconFileText className="mx-auto text-gray-400 mb-2" size={24} />
                                                <div className="text-lg font-bold text-gray-400">0%</div>
                                                <div className="text-xs text-gray-400">No Score</div>
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Resume Analyzed</h3>
                                    <p className="text-gray-600 mb-6">
                                        Upload your resume to get an ATS compatibility score and detailed feedback.
                                    </p>
                                    <button
                                        onClick={() => router.push(`/${params.id}/resume`)}
                                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                                    >
                                        <IconFileText size={18} />
                                        <span>Upload Resume</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Enhanced Job Recommendations Card */}
                        <div className="bg-gradient-to-br from-white to-purple-50/30 backdrop-blur-xl rounded-3xl shadow-xl border border-purple-100/50 p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="relative">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-blue-300 rounded-xl flex items-center justify-center">
                                            <IconBriefcase className="text-white" size={20} />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-800">Job Recommendations</h2>
                                    </div>
                                    {profileData?.preferredJobRoles?.length > 0 || profileData?.preferredJobLocations?.length > 0 ? (
                                        <div className="px-4 py-2 rounded-full text-sm font-bold bg-purple-100 text-purple-800 shadow-sm">
                                            {jobRecommendations.length} Matches
                                        </div>
                                    ) : (
                                        <div className="px-4 py-2 rounded-full text-sm font-bold bg-gray-100 text-gray-600 shadow-sm">
                                            General
                                        </div>
                                    )}
                            </div>

                            {profileData?.preferredJobRoles?.length > 0 || profileData?.preferredJobLocations?.length > 0 ? (
                                <>
                                    {/* User Preferences Display */}
                                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-medium text-blue-800">Your Preferences</h3>
                                            {profileData.updatedAt && (
                                                <span className="text-xs text-blue-600">
                                                    Updated {new Date(profileData.updatedAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {profileData.preferredJobRoles?.length > 0 ? (
                                                profileData.preferredJobRoles.map((role, index) => (
                                                    <span key={`role-${index}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                        <IconBriefcase size={12} className="mr-1" />
                                                        {role}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-blue-600 italic">No job roles specified</span>
                                            )}
                                            {profileData.preferredJobLocations?.length > 0 ? (
                                                profileData.preferredJobLocations.map((location, index) => (
                                                    <span key={`location-${index}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <IconMapPin size={12} className="mr-1" />
                                                        {location}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-blue-600 italic">No locations specified</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Job Listings */}
                                    <div className="space-y-4">
                                        {jobRecommendations.map((job) => (
                                            <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-800 hover:text-blue-600 cursor-pointer">
                                                            {job.title}
                                                        </h3>
                                                        <p className="text-gray-600 text-sm">{job.company}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <button 
                                                            className={`px-2 py-1 rounded-full text-xs font-medium hover:shadow-md transition-all ${
                                                                job.matchScore >= 90 ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                                                job.matchScore >= 80 ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                                                'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                            }`}
                                                            onClick={() => {
                                                                const matchInfo = `Match Score: ${job.matchScore}%\n\nThis score is based on:\n• Your skills and experience\n• Job requirements alignment\n• Location preferences\n• Role preferences\n\nClick "View All Jobs" for detailed match analysis.`;
                                                                alert(matchInfo);
                                                            }}
                                                            title="Click to see how this match score is calculated"
                                                        >
                                                            {job.matchScore}% Match
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                                                    <div className="flex items-center">
                                                        <IconMapPin size={14} className="mr-1" />
                                                        {job.location}
                                                    </div>
                                                    <div className="flex items-center">
                                                        <IconBriefcase size={14} className="mr-1" />
                                                        {job.type}
                                                    </div>
                                                    <div className="flex items-center">
                                                        <span className="text-gray-500 text-xs mr-1">Posted:</span>
                                                        {new Date(job.postedDate).toLocaleDateString()}
                                                    </div>
                                                </div>

                                                <p className="text-gray-700 text-sm mb-3">{job.description}</p>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-wrap gap-1">
                                                        {job.skills.slice(0, 3).map((skill, index) => (
                                                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {job.skills.length > 3 && (
                                                            <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                                                                +{job.skills.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-800">
                                                        {job.salary}
                                                    </div>
                                                </div>

                                                <div className="mt-3 pt-3 border-t border-gray-100">
                                                    <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                                                        View Job Details
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {jobRecommendations.length === 0 && (
                                        <div className="text-center py-8">
                                            <IconBriefcase className="mx-auto text-gray-400 mb-4" size={48} />
                                            <h3 className="text-lg font-medium text-gray-800 mb-2">No Matching Jobs Found</h3>
                                            <p className="text-gray-600 mb-4">
                                                We couldn't find jobs matching your exact preferences. Try updating your preferred roles or locations.
                                            </p>
                                            <button
                                                onClick={() => router.push(`/${params.id}/profile`)}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                Update Preferences
                                            </button>
                                        </div>
                                    )}

                                    <div className="mt-6 pt-4 border-t border-gray-200">
                                        <button 
                                            onClick={() => router.push(`/${params.id}/jobs`)}
                                            className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                                        >
                                            <span>View All Jobs</span>
                                            <IconArrowRight size={16} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                /* No Preferences Set */
                                <div className="text-center py-8">
                                    <IconTarget className="mx-auto text-gray-400 mb-4" size={48} />
                                    <h3 className="text-lg font-medium text-gray-800 mb-2">Set Your Job Preferences</h3>
                                    <p className="text-gray-600 mb-6">
                                        Add your preferred job roles and locations to get personalized job recommendations.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <button
                                            onClick={() => router.push(`/${params.id}/profile`)}
                                            className="bg-blue-300 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                        >
                                            <IconTarget size={18} />
                                            <span>Set Preferences</span>
                                        </button>
                                        <button
                                            onClick={() => router.push(`/${params.id}/jobs`)}
                                            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                                        >
                                            <IconBriefcase size={18} />
                                            <span>Browse All Jobs</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Profile Summary */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
                            <h3 className="font-semibold text-gray-800 mb-4">Quick Profile</h3>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                    <IconMail className="text-gray-400" size={16} />
                                    <span className="text-sm text-gray-600">
                                        {profileData?.email || user?.email || 'No email'}
                                    </span>
                                </div>
                                {profileData?.phone && (
                                    <div className="flex items-center space-x-3">
                                        <IconPhone className="text-gray-400" size={16} />
                                        <span className="text-sm text-gray-600">{profileData.phone}</span>
                                    </div>
                                )}
                                {profileData?.location && (
                                    <div className="flex items-center space-x-3">
                                        <IconMapPin className="text-gray-400" size={16} />
                                        <span className="text-sm text-gray-600">{profileData.location}</span>
                                    </div>
                                )}
                                {profileData?.updatedAt && (
                                    <div className="flex items-center space-x-3">
                                        <IconCalendar className="text-gray-400" size={16} />
                                        <span className="text-sm text-gray-600">
                                            Updated {new Date(profileData.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
                            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => router.push(`/${params.id}/jobs`)}
                                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                                >
                                    <IconBriefcase size={18} />
                                    <span>Browse Jobs</span>
                                </button>
                                <button
                                    onClick={() => router.push(`/${params.id}/profile`)}
                                    className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                                >
                                    <IconUser size={18} />
                                    <span>Edit Profile</span>
                                </button>
                                <button
                                    onClick={() => router.push(`/${params.id}/resume`)}
                                    className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                                >
                                    <IconFileText size={18} />
                                    <span>Upload Resume</span>
                                </button>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6">
                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                                <IconTrendingUp className="mr-2" size={18} />
                                Your Progress
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Profile Strength</span>
                                    <span className={`font-medium ${getCompletionColor(profileCompletion)}`}>
                                        {profileCompletion}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Skills Listed</span>
                                    <span className="font-medium text-gray-800">
                                        {profileData?.skills?.length || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Education Entries</span>
                                    <span className="font-medium text-gray-800">
                                        {profileData?.education?.length || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Certifications</span>
                                    <span className="font-medium text-gray-800">
                                        {profileData?.certifications?.length || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Job Locations</span>
                                    <span className="font-medium text-gray-800">
                                        {profileData?.preferredJobLocations?.length || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Job Roles</span>
                                    <span className="font-medium text-gray-800">
                                        {profileData?.preferredJobRoles?.length || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">ATS Score</span>
                                    <span className={`font-medium ${resumeData ? getATSScoreColor(resumeData.atsScore) : 'text-gray-400'}`}>
                                        {resumeData ? `${resumeData.atsScore}%` : 'No Resume'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}