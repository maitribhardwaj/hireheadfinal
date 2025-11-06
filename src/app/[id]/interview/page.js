"use client";
import { useParams } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import { db } from "../../../config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { IconPlayerPlay, IconSquare, IconAlertCircle, IconDownload, IconRotateClockwise, IconPlayerStop, IconX } from "@tabler/icons-react";
import Webcam from "react-webcam";

export default function InterviewPage() {
    const params = useParams();
    const webcamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recognitionRef = useRef(null);

    const [transcript, setTranscript] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const [videoBlob, setVideoBlob] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [interviewQuestions] = useState([
        "Tell me about yourself and your background.",
        "What are your greatest strengths?",
        "Describe a challenging situation you faced and how you handled it.",
        "Where do you see yourself in 5 years?",
        "Why do you want to work for our company?"
    ]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [showStopConfirm, setShowStopConfirm] = useState(false);

    const videoConstraints = {
        width: 1280,
        height: 720,
        facingMode: "user"
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

    const handleDataAvailable = useCallback(
        ({ data }) => {
            if (data.size > 0) {
                setRecordedChunks((prev) => prev.concat(data));
            }
        },
        [setRecordedChunks]
    );

    const startRecording = useCallback(() => {
        if (!webcamRef.current || !webcamRef.current.stream) {
            setError("Camera not ready. Please ensure camera access is granted.");
            return;
        }

        setError(null);
        setRecordedChunks([]);
        
        try {
            const stream = webcamRef.current.stream;
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "video/webm"
            });
            
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.addEventListener("dataavailable", handleDataAvailable);
            mediaRecorder.start();
            setIsRecording(true);
            
            // Start speech recognition
            startSpeechRecognition();
            
        } catch (err) {
            setError("Failed to start recording: " + err.message);
        }
    }, [webcamRef, handleDataAvailable]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            
            // Stop speech recognition
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        }
    }, [mediaRecorderRef, isRecording]);

    const startSpeechRecognition = () => {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (!SpeechRecognition) {
                console.log('Speech recognition not supported');
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";

            recognition.onresult = (event) => {
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    }
                }

                if (finalTranscript) {
                    setTranscript(prev => prev + finalTranscript);
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
            };

            recognition.start();
            recognitionRef.current = recognition;
        } catch (err) {
            console.error('Failed to start speech recognition:', err);
        }
    };

    useEffect(() => {
        if (recordedChunks.length > 0 && !isRecording) {
            const blob = new Blob(recordedChunks, {
                type: "video/webm"
            });
            setVideoBlob(blob);
            
            // Store video locally
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `interview-${params.id}-${Date.now()}.webm`;
            document.body.appendChild(a);
            // Don't auto-download, just prepare the blob
            document.body.removeChild(a);
        }
    }, [recordedChunks, isRecording, params.id]);

    const downloadVideo = () => {
        if (videoBlob) {
            const url = URL.createObjectURL(videoBlob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `interview-${params.id}-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const analyzeInterview = async () => {
        if (!transcript.trim() && !videoBlob) {
            setError('No content to analyze. Please record an interview first.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Create FormData to send both transcript and video
            const formData = new FormData();
            formData.append('transcript', transcript);
            formData.append('userId', params.id);
            formData.append('questions', JSON.stringify(interviewQuestions));
            
            if (videoBlob) {
                formData.append('video', videoBlob, `interview-${params.id}-${Date.now()}.webm`);
            }

            const response = await fetch('/api/interview', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const result = await response.json();
            setAnalysis(result);

            // Save to Firebase
            if (db) {
                await addDoc(collection(db, "interviews"), {
                    userId: params.id,
                    transcript,
                    analysis: result,
                    questions: interviewQuestions,
                    createdAt: serverTimestamp(),
                });
            }

            setSessionComplete(true);
        } catch (err) {
            setError('Failed to analyze interview: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const startNewSession = () => {
        setSessionStarted(false);
        setSessionComplete(false);
        setTranscript("");
        setAnalysis(null);
        setVideoBlob(null);
        setRecordedChunks([]);
        setCurrentQuestionIndex(0);
        setError(null);
    };

    const stopSession = () => {
        setShowStopConfirm(true);
    };

    const confirmStopSession = () => {
        // Stop recording if active
        if (isRecording) {
            stopRecording();
        }
        
        // Stop speech recognition if active
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        
        // Reset session
        setSessionStarted(false);
        setSessionComplete(false);
        setShowStopConfirm(false);
        setError(null);
    };

    const cancelStopSession = () => {
        setShowStopConfirm(false);
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < interviewQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const prevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Modern Header */}
            <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                            <IconPlayerPlay className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                Interview Practice
                            </h1>
                            <p className="text-gray-600">Practice interviews with AI feedback to improve your performance</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-2">
                            <IconAlertCircle className="text-red-500" size={20} />
                            <p className="text-red-800">{error}</p>
                        </div>
                    </div>
                )}

                {/* Stop Session Confirmation Dialog */}
                {showStopConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Stop Interview Session?</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to stop the interview session? Any current recording will be stopped and you'll lose your progress.
                            </p>
                            <div className="flex space-x-4">
                                <button
                                    onClick={confirmStopSession}
                                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <IconPlayerStop size={18} />
                                    <span>Yes, Stop Session</span>
                                </button>
                                <button
                                    onClick={cancelStopSession}
                                    className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    <IconX size={18} />
                                    <span>Cancel</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!sessionStarted && !sessionComplete && (
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8 text-center">
                        <h2 className="text-gray-900 text-2xl font-semibold mb-4">Welcome to AI Interview Practice</h2>
                        <p className="text-gray-900 mb-6">
                            This session will record your video responses to common interview questions. 
                            Your performance will be analyzed and rated based on communication skills, 
                            confidence, and content quality.
                        </p>
                        <div className="bg-blue-50 p-4 rounded-lg mb-6">
                            <h3 className="font-semibold text-gray-900 mb-2">You'll be asked {interviewQuestions.length} questions:</h3>
                            <ul className="text-left text-gray-900 text-sm space-y-1">
                                {interviewQuestions.map((question, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                        <span className="text-blue-600 font-semibold">{index + 1}.</span>
                                        <span>{question}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button
                            onClick={() => setSessionStarted(true)}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold"
                        >
                            Start Interview Session
                        </button>
                    </div>
                )}

                {sessionStarted && !sessionComplete && (
                    <>
                        {/* Session Header with Stop Button */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 mb-6">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-4">
                                    <h2 className="text-xl font-semibold text-gray-800">Interview Session Active</h2>
                                    {isRecording && (
                                        <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                                            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                                            <span>Recording</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={stopSession}
                                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <IconPlayerStop size={18} />
                                    <span>Stop Session</span>
                                </button>
                            </div>
                        </div>

                        {/* Question Display */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">
                                    Question {currentQuestionIndex + 1} of {interviewQuestions.length}
                                </h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={prevQuestion}
                                        disabled={currentQuestionIndex === 0}
                                        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={nextQuestion}
                                        disabled={currentQuestionIndex === interviewQuestions.length - 1}
                                        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-lg text-blue-900 font-medium">
                                    {interviewQuestions[currentQuestionIndex]}
                                </p>
                            </div>
                        </div>

                        {/* Video Recording Section */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                            <div className="relative">
                                <Webcam
                                    audio={true}
                                    ref={webcamRef}
                                    videoConstraints={videoConstraints}
                                    onUserMedia={() => setIsCameraReady(true)}
                                    onUserMediaError={(error) => setError("Camera access denied: " + error.message)}
                                    className="w-full max-w-2xl mx-auto rounded-lg"
                                />
                                {isRecording && (
                                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                        <span>Recording</span>
                                    </div>
                                )}
                            </div>

                            {/* Recording Controls */}
                            <div className="flex justify-center space-x-4 mt-6">
                                <button
                                    onClick={isRecording ? stopRecording : startRecording}
                                    disabled={!isCameraReady}
                                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                                        isRecording 
                                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg' 
                                            : 'bg-green-600 hover:bg-green-700 text-white'
                                    } disabled:opacity-50`}
                                >
                                    {isRecording ? <IconSquare size={20} /> : <IconPlayerPlay size={20} />}
                                    <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
                                </button>

                                {isRecording && (
                                    <button
                                        onClick={stopRecording}
                                        className="flex items-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                    >
                                        <IconPlayerStop size={20} />
                                        <span>Stop</span>
                                    </button>
                                )}

                                {videoBlob && (
                                    <button
                                        onClick={downloadVideo}
                                        className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <IconDownload size={20} />
                                        <span>Download Video</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Transcript Section */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                            <h3 className="text-lg font-semibold mb-4">Live Transcript</h3>
                            <div className="bg-gray-50 p-4 rounded min-h-32 max-h-64 overflow-y-auto">
                                {transcript || (
                                    <p className="text-gray-500 italic">
                                        {isRecording ? 'Listening...' : 'Start recording to see transcript here'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Analysis Button */}
                        <div className="text-center">
                            <button
                                onClick={analyzeInterview}
                                disabled={(!transcript.trim() && !videoBlob) || isLoading}
                                className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-semibold"
                            >
                                {isLoading ? 'Analyzing Interview...' : 'Analyze & Get Rating'}
                            </button>
                        </div>
                    </>
                )}

                {/* Analysis Results */}
                {sessionComplete && analysis && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-green-600 mb-2">Interview Complete!</h2>
                            <p className="text-gray-600">Here's your performance analysis:</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-semibold text-blue-800">Overall Score</h3>
                                <div className="text-3xl font-bold text-blue-600 mt-2">
                                    {analysis.overallScore || 'N/A'}/10
                                </div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <h3 className="font-semibold text-green-800">Communication</h3>
                                <div className="text-3xl font-bold text-green-600 mt-2">
                                    {analysis.communicationScore || 'N/A'}/10
                                </div>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                                <h3 className="font-semibold text-purple-800">Confidence</h3>
                                <div className="text-3xl font-bold text-purple-600 mt-2">
                                    {analysis.confidenceScore || 'N/A'}/10
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-lg mb-6">
                            <h3 className="font-semibold mb-4">Detailed Feedback</h3>
                            <div className="space-y-4">
                                {analysis.feedback ? (
                                    <div className="prose max-w-none">
                                        <p>{analysis.feedback}</p>
                                    </div>
                                ) : (
                                    <pre className="whitespace-pre-wrap text-sm">
                                        {JSON.stringify(analysis, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={startNewSession}
                                className="flex items-center space-x-2 mx-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <IconRotateClockwise size={20} />
                                <span>Start New Interview</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}