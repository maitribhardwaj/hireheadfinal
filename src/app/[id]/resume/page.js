"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
// Firebase imports will be loaded dynamically to avoid SSR issues
import {
    FileText, Upload, CheckCircle, AlertCircle, 
    BarChart3, Target, BookOpen, ArrowLeft, RefreshCw
} from "lucide-react";

export default function ResumePage() {
    const params = useParams();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState(null);
    const [mounted, setMounted] = useState(false);

    // Ensure component is mounted before rendering (avoid SSR issues)
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // Try to load Firebase auth dynamically
                const { auth } = await import("../../../config/firebase");
                const { onAuthStateChanged } = await import("firebase/auth");
                
                const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
                    if (currentUser) {
                        console.log('✅ Firebase user authenticated:', currentUser.uid);
                        setUser(currentUser);
                    } else {
                        console.log('📝 No Firebase user, using URL parameter:', params.id);
                        setUser({
                            uid: params.id,
                            email: `${params.id}@example.com`
                        });
                    }
                });

                return () => unsubscribe();
            } catch (firebaseError) {
                console.log('⚠️ Firebase not available, using fallback user:', firebaseError.message);
                // Fallback to URL parameter
                setUser({
                    uid: params.id,
                    email: `${params.id}@example.com`
                });
            }
        };

        initializeAuth();
    }, [params.id]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.type === 'application/pdf' || selectedFile.type === 'text/plain') {
                setFile(selectedFile);
                setError(null);
            } else {
                setError('Please select a PDF or text file');
                setFile(null);
            }
        }
    };

    const analyzeResume = async () => {
        if (!file || !user) return;

        setAnalyzing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('resume', file);
            formData.append('userId', user.uid); // Important: Send the user ID

            console.log('📤 Sending resume for analysis with user ID:', user.uid);

            const response = await fetch('/api/resume/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            console.log('📊 Analysis result:', result);
            
            if (result.error) {
                throw new Error(result.error);
            }

            setAnalysis(result);
            
            // Show success message if stored in Firebase
            if (result.storedInFirebase) {
                console.log('✅ Analysis stored in Firebase successfully');
            } else {
                console.warn('⚠️ Analysis not stored in Firebase:', result.storageError);
            }

        } catch (err) {
            console.error('❌ Analysis error:', err);
            setError(err.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreBgColor = (score) => {
        if (score >= 80) return 'bg-green-100';
        if (score >= 60) return 'bg-yellow-100';
        return 'bg-red-100';
    };

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center mb-8">
                    <button
                        onClick={() => router.push(`/${params.id}`)}
                        className="mr-4 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Resume Analysis</h1>
                        <p className="text-gray-600">Upload and analyze your resume for ATS compatibility and optimization tips</p>
                    </div>
                </div>

                {/* Upload Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Resume</h2>
                    
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                        
                        {!file ? (
                            <>
                                <p className="text-gray-600 mb-4">
                                    Select a PDF or text file to analyze
                                </p>
                                <input
                                    type="file"
                                    accept=".pdf,.txt"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="resume-upload"
                                />
                                <label
                                    htmlFor="resume-upload"
                                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer inline-flex items-center space-x-2"
                                >
                                    <Upload size={18} />
                                    <span>Choose File</span>
                                </label>
                            </>
                        ) : (
                            <div>
                                <p className="text-gray-800 font-medium mb-2">{file.name}</p>
                                <p className="text-gray-500 text-sm mb-4">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                <div className="space-x-3">
                                    <button
                                        onClick={analyzeResume}
                                        disabled={analyzing}
                                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 inline-flex items-center space-x-2"
                                    >
                                        {analyzing ? (
                                            <>
                                                <RefreshCw className="animate-spin" size={18} />
                                                <span>Analyzing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <BarChart3 size={18} />
                                                <span>Analyze Resume</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setFile(null)}
                                        className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center space-x-2">
                                <AlertCircle className="text-red-600" size={20} />
                                <p className="text-red-800">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Analysis Results */}
                {analysis && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-800">Analysis Results</h2>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBgColor(analysis.atsScore)} ${getScoreColor(analysis.atsScore)}`}>
                                {analysis.atsScore >= 80 ? 'Excellent' : analysis.atsScore >= 60 ? 'Good' : 'Needs Work'}
                            </div>
                        </div>

                        {/* ATS Score Display */}
                        <div className="flex items-center justify-center mb-8">
                            <div className="relative w-40 h-40">
                                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
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
                                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - analysis.atsScore / 100)}`}
                                        className={`transition-all duration-1000 ${getScoreColor(analysis.atsScore).replace('text-', 'text-')}`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className={`text-4xl font-bold ${getScoreColor(analysis.atsScore)}`}>
                                            {analysis.atsScore}%
                                        </div>
                                        <div className="text-sm text-gray-500">ATS Score</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Score Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <BarChart3 className="mx-auto text-blue-600 mb-2" size={24} />
                                <div className="text-sm font-medium text-blue-800">Format Score</div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {analysis.formatScore}%
                                </div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <Target className="mx-auto text-green-600 mb-2" size={24} />
                                <div className="text-sm font-medium text-green-800">Content Score</div>
                                <div className="text-2xl font-bold text-green-600">
                                    {analysis.contentScore}%
                                </div>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                                <BookOpen className="mx-auto text-purple-600 mb-2" size={24} />
                                <div className="text-sm font-medium text-purple-800">Keyword Score</div>
                                <div className="text-2xl font-bold text-purple-600">
                                    {analysis.keywordScore}%
                                </div>
                            </div>
                        </div>

                        {/* Strengths and Improvements */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Strengths */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                                    <CheckCircle className="text-green-600 mr-2" size={20} />
                                    Strengths
                                </h3>
                                <div className="space-y-2">
                                    {analysis.strengths?.slice(0, 5).map((strength, index) => (
                                        <div key={index} className="flex items-start space-x-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                                            <p className="text-sm text-gray-700">{strength}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Improvements */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                                    <AlertCircle className="text-yellow-600 mr-2" size={20} />
                                    Improvements
                                </h3>
                                <div className="space-y-2">
                                    {analysis.improvements?.slice(0, 5).map((improvement, index) => (
                                        <div key={index} className="flex items-start space-x-2">
                                            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                                            <p className="text-sm text-gray-700">{improvement}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Storage Status */}
                        {analysis.storedInFirebase !== undefined && (
                            <div className={`p-4 rounded-lg ${analysis.storedInFirebase ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                <div className="flex items-center space-x-2">
                                    {analysis.storedInFirebase ? (
                                        <>
                                            <CheckCircle className="text-green-600" size={20} />
                                            <p className="text-green-800 font-medium">
                                                Analysis saved successfully! It will appear on your dashboard.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="text-red-600" size={20} />
                                            <p className="text-red-800 font-medium">
                                                Analysis completed but not saved to your profile.
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-6 flex space-x-4">
                            <button
                                onClick={() => router.push(`/${params.id}`)}
                                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                View Dashboard
                            </button>
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setAnalysis(null);
                                    setError(null);
                                }}
                                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Analyze Another
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}