'use client'

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { auth, db } from "../../../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import {
    User, Mail, Calendar, MapPin, Edit3, Save, X,
    GraduationCap, Award, Briefcase, FileText,
    Phone, Globe, Github, Linkedin, Plus, Trash2, Download
} from "lucide-react";
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
        <div className="p-8 bg-gray-100 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">Profile Settings</h1>
                            <p className="text-gray-600">Manage your personal information and career preferences</p>
                        </div>
                        {!isEditing ? (
                            <div className="flex space-x-3">
                                <button
                                    onClick={handleExportClick}
                                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Download size={16} />
                                    <span>Export PDF</span>
                                </button>
                                <button
                                    onClick={startEditing}
                                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Edit3 size={16} />
                                    <span>Edit Profile</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex space-x-2">
                                <button
                                    onClick={saveProfile}
                                    disabled={loading}
                                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    <Save size={16} />
                                    <span>{loading ? 'Saving...' : 'Save'}</span>
                                </button>
                                <button
                                    onClick={cancelEditing}
                                    className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    <X size={16} />
                                    <span>Cancel</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Success Message */}
                {saveSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-green-800 font-medium">Profile updated successfully!</p>
                        </div>
                    </div>
                )}

                {/* Basic Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h2>

                    <div className="flex items-center mb-6">
                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mr-6">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Profile" className="w-20 h-20 rounded-full" />
                            ) : (
                                <User size={40} className="text-gray-500" />
                            )}
                        </div>
                        <div className="flex-1">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={currentData.displayName || ''}
                                    onChange={(e) => updateTempData('displayName', e.target.value)}
                                    placeholder="Display Name"
                                    className="text-2xl font-semibold text-gray-800 bg-transparent border-b-2 border-gray-300 focus:border-blue-500 outline-none w-full"
                                />
                            ) : (
                                <h3 className="text-2xl font-semibold text-gray-800">{currentData.displayName || getDisplayName()}</h3>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Email */}
                        <div className="flex items-center space-x-3">
                            <Mail className="text-gray-500" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-gray-500">Email</p>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        value={currentData.email || ''}
                                        onChange={(e) => updateTempData('email', e.target.value)}
                                        className="text-gray-800 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none w-full"
                                    />
                                ) : (
                                    <p className="text-gray-800">{currentData.email || 'Not set'}</p>
                                )}
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="flex items-center space-x-3">
                            <Phone className="text-gray-500" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-gray-500">Phone</p>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        value={currentData.phone || ''}
                                        onChange={(e) => updateTempData('phone', e.target.value)}
                                        placeholder="Phone number"
                                        className="text-gray-800 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none w-full"
                                    />
                                ) : (
                                    <p className="text-gray-800">{currentData.phone || 'Not set'}</p>
                                )}
                            </div>
                        </div>

                        {/* Date of Birth */}
                        <div className="flex items-center space-x-3">
                            <Calendar className="text-gray-500" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-gray-500">Date of Birth</p>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        value={currentData.dateOfBirth || ''}
                                        onChange={(e) => updateTempData('dateOfBirth', e.target.value)}
                                        className="text-gray-800 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none w-full"
                                    />
                                ) : (
                                    <p className="text-gray-800">{currentData.dateOfBirth ? new Date(currentData.dateOfBirth).toLocaleDateString() : 'Not set'}</p>
                                )}
                            </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-center space-x-3">
                            <MapPin className="text-gray-500" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-gray-500">Location</p>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={currentData.location || ''}
                                        onChange={(e) => updateTempData('location', e.target.value)}
                                        placeholder="City, Country"
                                        className="text-gray-800 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none w-full"
                                    />
                                ) : (
                                    <p className="text-gray-800">{currentData.location || 'Not set'}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Profile Summary */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Profile Summary</h2>
                    {isEditing ? (
                        <textarea
                            value={currentData.profileSummary || ''}
                            onChange={(e) => updateTempData('profileSummary', e.target.value)}
                            placeholder="Write a brief summary about yourself, your experience, and career goals..."
                            rows={4}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 outline-none resize-none"
                        />
                    ) : (
                        <p className="text-gray-700 leading-relaxed">
                            {currentData.profileSummary || 'No profile summary added yet.'}
                        </p>
                    )}
                </div>

                {/* Skills */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Skills</h2>
                        {isEditing && !showSkillInput && (
                            <button
                                onClick={addSkill}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                            >
                                <Plus size={16} />
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
                                            <X size={14} />
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
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Preferred Job Locations</h2>
                        {isEditing && !showJobLocationInput && (
                            <button
                                onClick={addJobLocation}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                            >
                                <Plus size={16} />
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
                                    <MapPin size={14} className="mr-1" />
                                    <span>{location}</span>
                                    {isEditing && (
                                        <button
                                            onClick={() => removeJobLocation(index)}
                                            className="ml-2 text-green-600 hover:text-green-800"
                                        >
                                            <X size={14} />
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
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Preferred Job Roles</h2>
                        {isEditing && !showJobRoleInput && (
                            <button
                                onClick={addJobRole}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                            >
                                <Plus size={16} />
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
                                    <Briefcase size={14} className="mr-1" />
                                    <span>{role}</span>
                                    {isEditing && (
                                        <button
                                            onClick={() => removeJobRole(index)}
                                            className="ml-2 text-purple-600 hover:text-purple-800"
                                        >
                                            <X size={14} />
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
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Education</h2>
                        {isEditing && (
                            <button
                                onClick={addEducation}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                            >
                                <Plus size={16} />
                                <span>Add Education</span>
                            </button>
                        )}
                    </div>

                    {(currentData.education || []).length > 0 ? (
                        <div className="space-y-4">
                            {(currentData.education || []).map((edu, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <GraduationCap className="text-gray-500 mt-1" size={20} />
                                        {isEditing && (
                                            <button
                                                onClick={() => removeEducation(index)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 size={16} />
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
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Certifications</h2>
                        {isEditing && (
                            <button
                                onClick={addCertification}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                            >
                                <Plus size={16} />
                                <span>Add Certification</span>
                            </button>
                        )}
                    </div>

                    {(currentData.certifications || []).length > 0 ? (
                        <div className="space-y-4">
                            {(currentData.certifications || []).map((cert, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <Award className="text-gray-500 mt-1" size={20} />
                                        {isEditing && (
                                            <button
                                                onClick={() => removeCertification(index)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 size={16} />
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

                {/* Social Links */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Social Links</h2>

                    <div className="space-y-4">
                        {/* LinkedIn */}
                        <div className="flex items-center space-x-3">
                            <Linkedin className="text-blue-600" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-gray-500">LinkedIn</p>
                                {isEditing ? (
                                    <input
                                        type="url"
                                        value={currentData.socialLinks?.linkedin || ''}
                                        onChange={(e) => updateNestedTempData('socialLinks', 'linkedin', e.target.value)}
                                        placeholder="https://linkedin.com/in/yourprofile"
                                        className="text-gray-800 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none w-full"
                                    />
                                ) : (
                                    <p className="text-gray-800">
                                        {currentData.socialLinks?.linkedin ? (
                                            <a href={currentData.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {currentData.socialLinks.linkedin}
                                            </a>
                                        ) : 'Not set'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* GitHub */}
                        <div className="flex items-center space-x-3">
                            <Github className="text-gray-800" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-gray-500">GitHub</p>
                                {isEditing ? (
                                    <input
                                        type="url"
                                        value={currentData.socialLinks?.github || ''}
                                        onChange={(e) => updateNestedTempData('socialLinks', 'github', e.target.value)}
                                        placeholder="https://github.com/yourusername"
                                        className="text-gray-800 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none w-full"
                                    />
                                ) : (
                                    <p className="text-gray-800">
                                        {currentData.socialLinks?.github ? (
                                            <a href={currentData.socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {currentData.socialLinks.github}
                                            </a>
                                        ) : 'Not set'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Website */}
                        <div className="flex items-center space-x-3">
                            <Globe className="text-green-600" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-gray-500">Website</p>
                                {isEditing ? (
                                    <input
                                        type="url"
                                        value={currentData.socialLinks?.website || ''}
                                        onChange={(e) => updateNestedTempData('socialLinks', 'website', e.target.value)}
                                        placeholder="https://yourwebsite.com"
                                        className="text-gray-800 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none w-full"
                                    />
                                ) : (
                                    <p className="text-gray-800">
                                        {currentData.socialLinks?.website ? (
                                            <a href={currentData.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {currentData.socialLinks.website}
                                            </a>
                                        ) : 'Not set'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
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
    );
}