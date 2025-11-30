'use client'

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { auth, db } from "../../../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import {
    IconUser, IconMail, IconCalendar, IconMapPin, IconEdit, IconDeviceFloppy, IconX,
    IconSchool, IconAward, IconBriefcase, IconFileText,
    IconPhone, IconWorld, IconBrandGithub, IconBrandLinkedin, IconPlus, IconTrash, IconDownload
} from "@tabler/icons-react";
import PDFExport from "../../../components/PDFExport";

export default function ProfilePage() {
    const params = useParams();
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [profileData, setProfileData] = useState({
        displayName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
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
    });
    const [tempData, setTempData] = useState({});
    const [showExportDialog, setShowExportDialog] = useState(false);

    useEffect(() => {
        let profileUnsubscribe = null;
        
        const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                await loadProfileData(currentUser.uid);
                
                // Set up real-time listener for profile updates
                const docRef = doc(db, 'userProfiles', currentUser.uid);
                profileUnsubscribe = onSnapshot(docRef, (doc) => {
                    if (doc.exists() && !isEditing) {
                        const data = doc.data();
                        console.log('🔄 Profile data updated from Firebase:', data);
                        setProfileData(prevData => ({
                            ...prevData,
                            ...data,
                            socialLinks: {
                                ...prevData.socialLinks,
                                ...data.socialLinks
                            }
                        }));
                    }
                });
            }
        });
        
        return () => {
            authUnsubscribe();
            if (profileUnsubscribe) {
                profileUnsubscribe();
            }
        };
    }, [isEditing]);

    const loadProfileData = async (userId) => {
        setInitialLoading(true);
        try {
            console.log('🔍 Loading profile data for user:', userId);
            const docRef = doc(db, 'userProfiles', userId);
            const docSnap = await getDoc(docRef);

            const initialData = {
                displayName: user?.displayName || '',
                email: user?.email || '',
                phone: '',
                dateOfBirth: '',
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

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('✅ Profile data found in Firebase:', data);
                setProfileData({
                    ...initialData,
                    ...data,
                    displayName: data.displayName || user?.displayName || '',
                    email: data.email || user?.email || '',
                    socialLinks: {
                        ...initialData.socialLinks,
                        ...data.socialLinks
                    }
                });
            } else {
                console.log('📝 No existing profile data, using initial data');
                setProfileData(initialData);
                
                // Create initial profile document
                await setDoc(docRef, {
                    ...initialData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                console.log('✅ Initial profile document created');
            }
        } catch (error) {
            console.error('❌ Error loading profile data:', error);
            // Set default data on error
            setProfileData({
                displayName: user?.displayName || '',
                email: user?.email || '',
                phone: '',
                dateOfBirth: '',
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
            });
        } finally {
            setInitialLoading(false);
        }
    };

    const getDisplayName = () => {
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

    const startEditing = () => {
        setTempData({ ...profileData });
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setTempData({});
        setIsEditing(false);
    };

    const validateProfile = () => {
        const errors = [];

        if (!tempData.displayName?.trim()) {
            errors.push('Display name is required');
        }

        if (!tempData.email?.trim()) {
            errors.push('Email is required');
        } else if (!/\S+@\S+\.\S+/.test(tempData.email)) {
            errors.push('Please enter a valid email address');
        }

        // Validate social links if provided
        const urlPattern = /^https?:\/\/.+/;
        if (tempData.socialLinks?.linkedin && !urlPattern.test(tempData.socialLinks.linkedin)) {
            errors.push('LinkedIn URL must start with http:// or https://');
        }
        if (tempData.socialLinks?.github && !urlPattern.test(tempData.socialLinks.github)) {
            errors.push('GitHub URL must start with http:// or https://');
        }
        if (tempData.socialLinks?.website && !urlPattern.test(tempData.socialLinks.website)) {
            errors.push('Website URL must start with http:// or https://');
        }

        return errors;
    };

    const saveProfile = async () => {
        if (!user) return;

        const validationErrors = validateProfile();
        if (validationErrors.length > 0) {
            alert('Please fix the following errors:\n' + validationErrors.join('\n'));
            return;
        }

        setLoading(true);
        setSaveSuccess(false);
        try {
            console.log('💾 Saving profile data to Firebase:', tempData);
            const docRef = doc(db, 'userProfiles', user.uid);
            
            const dataToSave = {
                ...tempData,
                updatedAt: new Date().toISOString(),
                userId: user.uid
            };
            
            await setDoc(docRef, dataToSave, { merge: true });
            console.log('✅ Profile data saved successfully');

            setProfileData({ ...tempData });
            setIsEditing(false);
            setTempData({});
            setSaveSuccess(true);

            // Hide success message after 3 seconds
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('❌ Error saving profile:', error);
            alert('Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const updateTempData = (field, value) => {
        setTempData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const updateNestedTempData = (parent, field, value) => {
        setTempData(prev => ({
            ...prev,
            [parent]: {
                ...prev[parent],
                [field]: value
            }
        }));
    };

    const [newSkill, setNewSkill] = useState('');
    const [showSkillInput, setShowSkillInput] = useState(false);
    const [newJobLocation, setNewJobLocation] = useState('');
    const [showJobLocationInput, setShowJobLocationInput] = useState(false);
    const [newJobRole, setNewJobRole] = useState('');
    const [showJobRoleInput, setShowJobRoleInput] = useState(false);

    const addSkill = () => {
        setShowSkillInput(true);
    };

    const saveNewSkill = () => {
        if (newSkill && newSkill.trim()) {
            updateTempData('skills', [...(tempData.skills || []), newSkill.trim()]);
            setNewSkill('');
            setShowSkillInput(false);
        }
    };

    const cancelNewSkill = () => {
        setNewSkill('');
        setShowSkillInput(false);
    };

    // Job Location functions
    const addJobLocation = () => {
        setShowJobLocationInput(true);
    };

    const saveNewJobLocation = () => {
        if (newJobLocation && newJobLocation.trim()) {
            updateTempData('preferredJobLocations', [...(tempData.preferredJobLocations || []), newJobLocation.trim()]);
            setNewJobLocation('');
            setShowJobLocationInput(false);
        }
    };

    const cancelNewJobLocation = () => {
        setNewJobLocation('');
        setShowJobLocationInput(false);
    };

    const removeJobLocation = (index) => {
        const updatedLocations = (tempData.preferredJobLocations || []).filter((_, i) => i !== index);
        updateTempData('preferredJobLocations', updatedLocations);
    };

    // Job Role functions
    const addJobRole = () => {
        setShowJobRoleInput(true);
    };

    const saveNewJobRole = () => {
        if (newJobRole && newJobRole.trim()) {
            updateTempData('preferredJobRoles', [...(tempData.preferredJobRoles || []), newJobRole.trim()]);
            setNewJobRole('');
            setShowJobRoleInput(false);
        }
    };

    const cancelNewJobRole = () => {
        setNewJobRole('');
        setShowJobRoleInput(false);
    };

    const removeJobRole = (index) => {
        const updatedRoles = (tempData.preferredJobRoles || []).filter((_, i) => i !== index);
        updateTempData('preferredJobRoles', updatedRoles);
    };

    const removeSkill = (index) => {
        const updatedSkills = (tempData.skills || []).filter((_, i) => i !== index);
        updateTempData('skills', updatedSkills);
    };

    const addEducation = () => {
        const newEducation = {
            degree: '',
            institution: '',
            year: '',
            description: ''
        };
        updateTempData('education', [...(tempData.education || []), newEducation]);
    };

    const updateEducation = (index, field, value) => {
        const updatedEducation = [...(tempData.education || [])];
        updatedEducation[index] = {
            ...updatedEducation[index],
            [field]: value
        };
        updateTempData('education', updatedEducation);
    };

    const removeEducation = (index) => {
        const updatedEducation = (tempData.education || []).filter((_, i) => i !== index);
        updateTempData('education', updatedEducation);
    };

    const addCertification = () => {
        const newCert = {
            name: '',
            issuer: '',
            date: '',
            credentialId: ''
        };
        updateTempData('certifications', [...(tempData.certifications || []), newCert]);
    };

    const updateCertification = (index, field, value) => {
        const updatedCerts = [...(tempData.certifications || [])];
        updatedCerts[index] = {
            ...updatedCerts[index],
            [field]: value
        };
        updateTempData('certifications', updatedCerts);
    };

    const removeCertification = (index) => {
        const updatedCerts = (tempData.certifications || []).filter((_, i) => i !== index);
        updateTempData('certifications', updatedCerts);
    };

    // PDF Export Functions
    const handleExportClick = () => {
        setShowExportDialog(true);
    };

    const handleCloseExportDialog = () => {
        setShowExportDialog(false);
    };

    if (!user) return null;

    if (initialLoading) {
        return (
            <div className="p-8 bg-gray-100 min-h-screen">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading profile...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const currentData = isEditing ? tempData : profileData;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Modern Header with Glassmorphism */}
            <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
                                <IconUser className="text-white" size={24} />
                            </div>
                            <div>
                                <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                    Profile Settings
                                </h1>
                                <p className="text-gray-600 text-sm sm:text-base">Manage your professional profile</p>
                            </div>
                        </div>
                        
                        {/* Modern Action Buttons */}
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            {!isEditing ? (
                                <>
                                    <button
                                        onClick={handleExportClick}
                                        className="group flex items-center space-x-2 bg-black text-white px-4 py-2.5 rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm font-medium"
                                    >
                                        <IconDownload size={16} className="group-hover:scale-110 transition-transform" />
                                        <span>Export PDF</span>
                                    </button>
                                    <button
                                        onClick={startEditing}
                                        className="group flex items-center space-x-2 bg-black text-white px-4 py-2.5 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm font-medium"
                                    >
                                        <IconEdit size={16} className="group-hover:scale-110 transition-transform" />
                                        <span>Edit Profile</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={saveProfile}
                                        disabled={loading}
                                        className="group flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2.5 rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none text-sm font-medium"
                                    >
                                        <IconDeviceFloppy size={16} className="group-hover:scale-110 transition-transform" />
                                        <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                                    </button>
                                    <button
                                        onClick={cancelEditing}
                                        className="group flex items-center space-x-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2.5 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm font-medium"
                                    >
                                        <IconX size={16} className="group-hover:scale-110 transition-transform" />
                                        <span>Cancel</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* Modern Success Message */}
                    {saveSuccess && (
                        <div className="lg:col-span-4 mb-6">
                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-emerald-800">Profile Updated Successfully!</h3>
                                        <p className="text-emerald-700 text-sm">Your changes have been saved and are now live across the platform.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modern Profile Header Card */}
                    <div className="lg:col-span-3">
                        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8 mb-8">
                            {/* Profile Avatar and Name */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
                                <div className="relative group">
                                    <div className="w-32 h-32 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-all duration-300">
                                        {user?.photoURL ? (
                                            <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-3xl object-cover" />
                                        ) : (
                                            <IconUser size={48} className="text-white" />
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                </div>
                                
                                <div className="flex-1 text-center sm:text-left">
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={currentData.displayName || ''}
                                                onChange={(e) => updateTempData('displayName', e.target.value)}
                                                placeholder="Enter your full name"
                                                className="text-2xl lg:text-3xl font-bold bg-transparent border-b-2 border-gray-300 focus:border-blue-500 outline-none w-full transition-all duration-200 text-gray-900"
                                            />
                                            <p className="text-gray-500 text-sm">Update your display name</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                                                {currentData.displayName || getDisplayName()}
                                            </h1>
                                            <p className="text-gray-600 text-lg">Professional Profile</p>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                    Active
                                                </span>
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    Verified
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contact Information Section */}
                            <div className="mt-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                        Contact Information
                                    </h3>
                                    <div className="flex space-x-1">
                                        <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                                        <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                                        <div className="w-1 h-1 bg-pink-400 rounded-full"></div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Email Card */}
                                    <div className="group relative overflow-hidden h-32">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl transform rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                                        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                                            <div className="flex items-center space-x-3 mb-3">
                                                <div className="relative">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                                        <IconMail className="text-white" size={20} />
                                                    </div>
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-300 rounded-full"></div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-900 text-sm">Email Address</h4>
                                                </div>
                                            </div>
                                            <div className="ml-15">
                                                {isEditing ? (
                                                    <input
                                                        type="email"
                                                        value={currentData.email || ''}
                                                        onChange={(e) => updateTempData('email', e.target.value)}
                                                        placeholder="your.email@example.com"
                                                        className="w-full text-sm text-gray-900 bg-white/70 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                    />
                                                ) : (
                                                    <p className="text-sm text-gray-700 font-medium truncate">{currentData.email || 'Not provided'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Phone Card */}
                                    <div className="group relative overflow-hidden h-32">
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl transform -rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                                        <div className="relative bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-5 border border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                                            <div className="flex items-center space-x-3 mb-3">
                                                <div className="relative">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                                        <IconPhone className="text-white" size={20} />
                                                    </div>
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-300 rounded-full"></div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-900 text-sm">Phone Number</h4>
                                                </div>
                                            </div>
                                            <div className="ml-15">
                                                {isEditing ? (
                                                    <input
                                                        type="tel"
                                                        value={currentData.phone || ''}
                                                        onChange={(e) => updateTempData('phone', e.target.value)}
                                                        placeholder="+1 (555) 123-4567"
                                                        className="w-full text-sm text-gray-900 bg-white/70 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                                    />
                                                ) : (
                                                    <p className="text-sm text-gray-700 font-medium">{currentData.phone || 'Not provided'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Date of Birth Card */}
                                    <div className="group relative overflow-hidden h-32">
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl transform rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                                        <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                                            <div className="flex items-center space-x-3 mb-3">
                                                <div className="relative">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                                                        <IconCalendar className="text-white" size={20} />
                                                    </div>
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-300 rounded-full"></div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-900 text-sm">Date of Birth</h4>
                                                </div>
                                            </div>
                                            <div className="ml-15">
                                                {isEditing ? (
                                                    <input
                                                        type="date"
                                                        value={currentData.dateOfBirth || ''}
                                                        onChange={(e) => updateTempData('dateOfBirth', e.target.value)}
                                                        className="w-full text-sm text-gray-900 bg-white/70 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                                    />
                                                ) : (
                                                    <p className="text-sm text-gray-700 font-medium">{currentData.dateOfBirth ? new Date(currentData.dateOfBirth).toLocaleDateString() : 'Not provided'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location Card */}
                                    <div className="group relative overflow-hidden h-32">
                                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-2xl transform -rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                                        <div className="relative bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                                            <div className="flex items-center space-x-3 mb-3">
                                                <div className="relative">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                                                        <IconMapPin className="text-white" size={20} />
                                                    </div>
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-300 rounded-full"></div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-900 text-sm">Location</h4>
                                                </div>
                                            </div>
                                            <div className="ml-15">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={currentData.location || ''}
                                                        onChange={(e) => updateTempData('location', e.target.value)}
                                                        placeholder="City, State, Country"
                                                        className="w-full text-sm text-gray-900 bg-white/70 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                                    />
                                                ) : (
                                                    <p className="text-sm text-gray-700 font-medium">{currentData.location || 'Not provided'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar with Quick Stats */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">
                            {/* Profile Completion Card */}
                            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-4">
                                <div className="text-center">
                                    <div className="relative w-16 h-16 mx-auto mb-3">
                                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
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
                                                strokeDashoffset={`${2 * Math.PI * 40 * (1 - (profileData ? 75 : 0) / 100)}`}
                                                className="text-blue-500 transition-all duration-500"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-gray-900">75%</div>
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="font-medium text-gray-900 text-sm mb-1">Profile</h3>
                                    <p className="text-gray-600 text-xs">75% Complete</p>
                                </div>
                            </div>

                            {/* Quick Actions Card */}
                            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-4">
                                <h3 className="font-medium text-gray-900 text-sm mb-3">Actions</h3>
                                <div className="space-y-2">
                                    <button className="w-full bg-blue-300 text-black px-3 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 text-xs font-medium">
                                        Dashboard
                                    </button>
                                    <button className="w-full bg-pink-300  text-black px-3 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 text-xs font-medium">
                                        Jobs
                                    </button>
                                    <button className="w-full bg-green-300 text-black px-3 py-2 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 text-xs font-medium">
                                        Resume
                                    </button>
                                </div>
                            </div>

                            {/* Social Links Card */}
                            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-4">
                                <h3 className="font-medium text-gray-900 text-sm mb-3">Links</h3>
                                <div className="space-y-3">
                                    {/* LinkedIn */}
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <IconBrandLinkedin className="text-blue-600" size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {isEditing ? (
                                                <input
                                                    type="url"
                                                    value={currentData.socialLinks?.linkedin || ''}
                                                    onChange={(e) => updateNestedTempData('socialLinks', 'linkedin', e.target.value)}
                                                    placeholder="LinkedIn URL"
                                                    className="w-full text-xs text-gray-900 bg-white/50 border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none"
                                                />
                                            ) : (
                                                <div className="text-xs">
                                                    {currentData.socialLinks?.linkedin ? (
                                                        <a href={currentData.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">
                                                            LinkedIn
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-500">LinkedIn</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* GitHub */}
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <IconBrandGithub className="text-gray-700" size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {isEditing ? (
                                                <input
                                                    type="url"
                                                    value={currentData.socialLinks?.github || ''}
                                                    onChange={(e) => updateNestedTempData('socialLinks', 'github', e.target.value)}
                                                    placeholder="GitHub URL"
                                                    className="w-full text-xs text-gray-900 bg-white/50 border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-gray-500 focus:border-transparent outline-none"
                                                />
                                            ) : (
                                                <div className="text-xs">
                                                    {currentData.socialLinks?.github ? (
                                                        <a href={currentData.socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">
                                                            GitHub
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-500">GitHub</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Website */}
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <IconWorld className="text-green-600" size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {isEditing ? (
                                                <input
                                                    type="url"
                                                    value={currentData.socialLinks?.website || ''}
                                                    onChange={(e) => updateNestedTempData('socialLinks', 'website', e.target.value)}
                                                    placeholder="Website URL"
                                                    className="w-full text-xs text-gray-900 bg-white/50 border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-green-500 focus:border-transparent outline-none"
                                                />
                                            ) : (
                                                <div className="text-xs">
                                                    {currentData.socialLinks?.website ? (
                                                        <a href={currentData.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">
                                                            Website
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-500">Website</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Summary - Enhanced */}
                    <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl lg:text-2xl font-semibold text-gray-900">Professional Summary</h2>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                        {isEditing ? (
                            <div className="space-y-2">
                                <textarea
                                    value={currentData.profileSummary || ''}
                                    onChange={(e) => updateTempData('profileSummary', e.target.value)}
                                    placeholder="Write a compelling summary about yourself, your experience, skills, and career goals. This will be the first thing employers see on your profile..."
                                    rows={6}
                                    className="w-full p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none transition-colors text-sm"
                                />
                                <p className="text-xs text-gray-500">Tip: Keep it concise but impactful. Aim for 2-3 sentences that highlight your key strengths.</p>
                            </div>
                        ) : (
                        <p className="text-gray-700 leading-relaxed">
                            {currentData.profileSummary || 'No profile summary added yet.'}
                        </p>
                    )}
                </div>

                {/* Skills */}
                <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Skills</h2>
                        {isEditing && !showSkillInput && (
                            <button
                                onClick={addSkill}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                            >
                                <IconPlus size={16} />
                                <span>Add Skill</span>
                            </button>
                        )}
                    </div>

                    {/* Inline skill input */}
                    {isEditing && showSkillInput && (
                        <div className="mb-4 flex items-center space-x-2">
                            <input
                                type="text"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                placeholder="Enter skill name"
                                className="flex-1 p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        saveNewSkill();
                                    } else if (e.key === 'Escape') {
                                        cancelNewSkill();
                                    }
                                }}
                                autoFocus
                            />
                            <button
                                onClick={saveNewSkill}
                                className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                            >
                                Add
                            </button>
                            <button
                                onClick={cancelNewSkill}
                                className="bg-gray-400 text-white px-3 py-2 rounded hover:bg-gray-500"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {(currentData.skills || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {(currentData.skills || []).map((skill, index) => (
                                <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                    <span>{skill}</span>
                                    {isEditing && (
                                        <button
                                            onClick={() => removeSkill(index)}
                                            className="ml-2 text-blue-600 hover:text-blue-800"
                                        >
                                            <IconX size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No skills added yet.</p>
                    )}
                </div>

                {/* Preferred Job Locations */}
                <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Preferred Job Locations</h2>
                        {isEditing && !showJobLocationInput && (
                            <button
                                onClick={addJobLocation}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                            >
                                <IconPlus size={16} />
                                <span>Add Location</span>
                            </button>
                        )}
                    </div>

                    {/* Inline location input */}
                    {isEditing && showJobLocationInput && (
                        <div className="mb-4 flex items-center space-x-2">
                            <input
                                type="text"
                                value={newJobLocation}
                                onChange={(e) => setNewJobLocation(e.target.value)}
                                placeholder="Enter preferred job location"
                                className="flex-1 p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        saveNewJobLocation();
                                    } else if (e.key === 'Escape') {
                                        cancelNewJobLocation();
                                    }
                                }}
                                autoFocus
                            />
                            <button
                                onClick={saveNewJobLocation}
                                className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                            >
                                Add
                            </button>
                            <button
                                onClick={cancelNewJobLocation}
                                className="bg-gray-400 text-white px-3 py-2 rounded hover:bg-gray-500"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {(currentData.preferredJobLocations || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {(currentData.preferredJobLocations || []).map((location, index) => (
                                <div key={index} className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full">
                                    <IconMapPin size={14} className="mr-1" />
                                    <span>{location}</span>
                                    {isEditing && (
                                        <button
                                            onClick={() => removeJobLocation(index)}
                                            className="ml-2 text-green-600 hover:text-green-800"
                                        >
                                            <IconX size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No preferred job locations added yet.</p>
                    )}
                </div>

                {/* Preferred Job Roles */}
                <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Preferred Job Roles</h2>
                        {isEditing && !showJobRoleInput && (
                            <button
                                onClick={addJobRole}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                            >
                                <IconPlus size={16} />
                                <span>Add Role</span>
                            </button>
                        )}
                    </div>

                    {/* Inline role input */}
                    {isEditing && showJobRoleInput && (
                        <div className="mb-4 flex items-center space-x-2">
                            <input
                                type="text"
                                value={newJobRole}
                                onChange={(e) => setNewJobRole(e.target.value)}
                                placeholder="Enter preferred job role"
                                className="flex-1 p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        saveNewJobRole();
                                    } else if (e.key === 'Escape') {
                                        cancelNewJobRole();
                                    }
                                }}
                                autoFocus
                            />
                            <button
                                onClick={saveNewJobRole}
                                className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                            >
                                Add
                            </button>
                            <button
                                onClick={cancelNewJobRole}
                                className="bg-gray-400 text-white px-3 py-2 rounded hover:bg-gray-500"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {(currentData.preferredJobRoles || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {(currentData.preferredJobRoles || []).map((role, index) => (
                                <div key={index} className="flex items-center bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                                    <IconBriefcase size={14} className="mr-1" />
                                    <span>{role}</span>
                                    {isEditing && (
                                        <button
                                            onClick={() => removeJobRole(index)}
                                            className="ml-2 text-purple-600 hover:text-purple-800"
                                        >
                                            <IconX size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No preferred job roles added yet.</p>
                    )}
                </div>

                {/* Education */}
                <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Education</h2>
                        {isEditing && (
                            <button
                                onClick={addEducation}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                            >
                                <IconPlus size={16} />
                                <span>Add Education</span>
                            </button>
                        )}
                    </div>

                    {(currentData.education || []).length > 0 ? (
                        <div className="space-y-4">
                            {(currentData.education || []).map((edu, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <IconSchool className="text-gray-500 mt-1" size={20} />
                                        {isEditing && (
                                            <button
                                                onClick={() => removeEducation(index)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <IconTrash size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={edu.degree || ''}
                                                onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                                                placeholder="Degree (e.g., Bachelor of Science in Computer Science)"
                                                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                            />
                                            <input
                                                type="text"
                                                value={edu.institution || ''}
                                                onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                                                placeholder="Institution name"
                                                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                            />
                                            <input
                                                type="text"
                                                value={edu.year || ''}
                                                onChange={(e) => updateEducation(index, 'year', e.target.value)}
                                                placeholder="Year (e.g., 2020-2024)"
                                                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                            />
                                            <textarea
                                                value={edu.description || ''}
                                                onChange={(e) => updateEducation(index, 'description', e.target.value)}
                                                placeholder="Description (optional)"
                                                rows={2}
                                                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none resize-none"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{edu.degree || 'Degree not specified'}</h3>
                                            <p className="text-gray-600">{edu.institution || 'Institution not specified'}</p>
                                            <p className="text-sm text-gray-500">{edu.year || 'Year not specified'}</p>
                                            {edu.description && (
                                                <p className="text-sm text-gray-700 mt-2">{edu.description}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No education information added yet.</p>
                    )}
                </div>

                {/* Certifications */}
                <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Certifications</h2>
                        {isEditing && (
                            <button
                                onClick={addCertification}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                            >
                                <IconPlus size={16} />
                                <span>Add Certification</span>
                            </button>
                        )}
                    </div>

                    {(currentData.certifications || []).length > 0 ? (
                        <div className="space-y-4">
                            {(currentData.certifications || []).map((cert, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <IconAward className="text-gray-500 mt-1" size={20} />
                                        {isEditing && (
                                            <button
                                                onClick={() => removeCertification(index)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <IconTrash size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={cert.name || ''}
                                                onChange={(e) => updateCertification(index, 'name', e.target.value)}
                                                placeholder="Certification name"
                                                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                            />
                                            <input
                                                type="text"
                                                value={cert.issuer || ''}
                                                onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                                                placeholder="Issuing organization"
                                                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                            />
                                            <input
                                                type="date"
                                                value={cert.date || ''}
                                                onChange={(e) => updateCertification(index, 'date', e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                            />
                                            <input
                                                type="text"
                                                value={cert.credentialId || ''}
                                                onChange={(e) => updateCertification(index, 'credentialId', e.target.value)}
                                                placeholder="Credential ID (optional)"
                                                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{cert.name || 'Certification name not specified'}</h3>
                                            <p className="text-gray-600">{cert.issuer || 'Issuer not specified'}</p>
                                            <p className="text-sm text-gray-500">
                                                {cert.date ? new Date(cert.date).toLocaleDateString() : 'Date not specified'}
                                            </p>
                                            {cert.credentialId && (
                                                <p className="text-sm text-gray-500">Credential ID: {cert.credentialId}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No certifications added yet.</p>
                    )}
                </div>



                {/* PDF Export Dialog */}
                {showExportDialog && (
                    <PDFExport 
                        profileData={profileData}
                        onClose={handleCloseExportDialog}
                    />
                )}
                </div>
            </div>
        </div>
    );
}