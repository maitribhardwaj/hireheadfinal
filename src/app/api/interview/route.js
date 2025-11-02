import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const transcript = formData.get('transcript');
        const userId = formData.get('userId');
        const questions = JSON.parse(formData.get('questions') || '[]');
        const videoFile = formData.get('video');

        // Basic validation
        if (!transcript && !videoFile) {
            return NextResponse.json(
                { error: 'No content provided for analysis' },
                { status: 400 }
            );
        }

        // Analyze transcript content
        const analysis = analyzeInterviewContent(transcript, questions);

        // If video file is provided, you could add video analysis here
        if (videoFile) {
            console.log(`Received video file: ${videoFile.name}, size: ${videoFile.size} bytes`);
            // In a real implementation, you would:
            // 1. Save the video file to cloud storage
            // 2. Use AI services to analyze facial expressions, body language, etc.
            // 3. Combine video analysis with transcript analysis
        }

        return NextResponse.json(analysis);

    } catch (error) {
        console.error('Interview analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze interview' },
            { status: 500 }
        );
    }
}

function analyzeInterviewContent(transcript, questions) {
    if (!transcript || transcript.trim().length === 0) {
        return {
            overallScore: 0,
            communicationScore: 0,
            confidenceScore: 0,
            feedback: "No speech detected. Please ensure your microphone is working and try speaking clearly."
        };
    }

    const words = transcript.toLowerCase().split(/\s+/);
    const wordCount = words.length;

    // Basic analysis metrics
    const metrics = {
        wordCount,
        averageWordsPerQuestion: Math.round(wordCount / questions.length),
        fillerWords: countFillerWords(words),
        positiveWords: countPositiveWords(words),
        technicalTerms: countTechnicalTerms(words),
        sentenceComplexity: analyzeSentenceComplexity(transcript)
    };

    // Calculate scores (1-10 scale)
    const communicationScore = calculateCommunicationScore(metrics);
    const confidenceScore = calculateConfidenceScore(metrics);
    const contentScore = calculateContentScore(metrics);

    const overallScore = Math.round((communicationScore + confidenceScore + contentScore) / 3);

    // Generate feedback
    const feedback = generateFeedback(metrics, {
        communication: communicationScore,
        confidence: confidenceScore,
        content: contentScore,
        overall: overallScore
    });

    return {
        overallScore,
        communicationScore,
        confidenceScore,
        contentScore,
        metrics,
        feedback,
        analysisDate: new Date().toISOString()
    };
}

function countFillerWords(words) {
    const fillerWords = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally'];
    return words.filter(word => fillerWords.includes(word)).length;
}

function countPositiveWords(words) {
    const positiveWords = [
        'excellent', 'great', 'amazing', 'successful', 'achieved', 'accomplished',
        'improved', 'enhanced', 'optimized', 'innovative', 'creative', 'passionate',
        'dedicated', 'motivated', 'enthusiastic', 'confident', 'skilled', 'experienced'
    ];
    return words.filter(word => positiveWords.includes(word)).length;
}

function countTechnicalTerms(words) {
    const technicalTerms = [
        'javascript', 'python', 'react', 'node', 'database', 'api', 'framework',
        'algorithm', 'data', 'analysis', 'development', 'programming', 'software',
        'technology', 'system', 'architecture', 'design', 'implementation'
    ];
    return words.filter(word => technicalTerms.includes(word)).length;
}

function analyzeSentenceComplexity(transcript) {
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = transcript.split(/\s+/).length / sentences.length;

    if (avgWordsPerSentence > 20) return 'complex';
    if (avgWordsPerSentence > 12) return 'moderate';
    return 'simple';
}

function calculateCommunicationScore(metrics) {
    let score = 5; // Base score

    // Word count factor
    if (metrics.wordCount > 200) score += 2;
    else if (metrics.wordCount > 100) score += 1;
    else if (metrics.wordCount < 50) score -= 2;

    // Filler words penalty
    const fillerRatio = metrics.fillerWords / metrics.wordCount;
    if (fillerRatio > 0.1) score -= 2;
    else if (fillerRatio > 0.05) score -= 1;

    // Sentence complexity bonus
    if (metrics.sentenceComplexity === 'complex') score += 1;
    else if (metrics.sentenceComplexity === 'simple') score -= 1;

    return Math.max(1, Math.min(10, score));
}

function calculateConfidenceScore(metrics) {
    let score = 5; // Base score

    // Positive words boost confidence
    if (metrics.positiveWords > 5) score += 2;
    else if (metrics.positiveWords > 2) score += 1;

    // Filler words reduce confidence
    const fillerRatio = metrics.fillerWords / metrics.wordCount;
    if (fillerRatio > 0.1) score -= 3;
    else if (fillerRatio > 0.05) score -= 1;

    // Word count indicates confidence
    if (metrics.wordCount > 150) score += 1;
    else if (metrics.wordCount < 50) score -= 2;

    return Math.max(1, Math.min(10, score));
}

function calculateContentScore(metrics) {
    let score = 5; // Base score

    // Technical terms show expertise
    if (metrics.technicalTerms > 3) score += 2;
    else if (metrics.technicalTerms > 1) score += 1;

    // Word count per question
    if (metrics.averageWordsPerQuestion > 40) score += 2;
    else if (metrics.averageWordsPerQuestion > 20) score += 1;
    else if (metrics.averageWordsPerQuestion < 10) score -= 2;

    // Positive words indicate good content
    if (metrics.positiveWords > 3) score += 1;

    return Math.max(1, Math.min(10, score));
}

function generateFeedback(metrics, scores) {
    let feedback = [];

    // Overall performance
    if (scores.overall >= 8) {
        feedback.push("🎉 Excellent performance! You demonstrated strong communication skills and confidence.");
    } else if (scores.overall >= 6) {
        feedback.push("👍 Good job! You showed solid interview skills with room for improvement.");
    } else {
        feedback.push("💪 Keep practicing! There are several areas where you can improve your interview performance.");
    }

    // Communication feedback
    if (scores.communication >= 8) {
        feedback.push("✅ Your communication was clear and well-structured.");
    } else if (scores.communication <= 4) {
        feedback.push("📢 Focus on speaking more clearly and providing more detailed responses.");
    }

    // Confidence feedback
    if (scores.confidence >= 8) {
        feedback.push("💪 You spoke with great confidence and used positive language.");
    } else if (scores.confidence <= 4) {
        const fillerRatio = metrics.fillerWords / metrics.wordCount;
        if (fillerRatio > 0.05) {
            feedback.push("🎯 Try to reduce filler words like 'um', 'uh', and 'like' to sound more confident.");
        }
        feedback.push("🌟 Use more positive and assertive language to boost your confidence.");
    }

    // Content feedback
    if (scores.content >= 8) {
        feedback.push("📚 Your responses showed good depth and relevant experience.");
    } else if (scores.content <= 4) {
        feedback.push("📖 Provide more specific examples and details in your responses.");
        if (metrics.technicalTerms === 0) {
            feedback.push("🔧 Include relevant technical terms and industry knowledge when appropriate.");
        }
    }

    // Specific improvements
    if (metrics.wordCount < 100) {
        feedback.push("⏱️ Try to elaborate more on your answers - aim for 30-60 seconds per response.");
    }

    if (metrics.averageWordsPerQuestion < 20) {
        feedback.push("📝 Provide more comprehensive answers with specific examples and details.");
    }

    // Positive reinforcement
    if (metrics.positiveWords > 0) {
        feedback.push("✨ Great use of positive language - this shows enthusiasm and professionalism.");
    }

    return feedback.join(' ');
}