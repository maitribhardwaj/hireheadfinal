import { NextResponse } from "next/server";
// OPTIONAL: Enable OpenAI AI analysis
// import OpenAI from "openai";
// const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request) {
    try {
        const formData = await request.formData();
        const transcript = formData.get("transcript");
        const userId = formData.get("userId");
        const questions = JSON.parse(formData.get("questions") || "[]");
        const videoFile = formData.get("video");

        if (!transcript || transcript.trim().length === 0) {
            return NextResponse.json(
                { error: "Transcript is empty" },
                { status: 400 }
            );
        }

        // Base analysis
        const basicAnalysis = analyzeInterviewContent(transcript, questions);

        // Optional: AI-Enhanced Analysis (Uncomment)
        /*
        const aiAnalysis = await analyzeWithOpenAI(transcript, questions);
        const finalAnalysis = { ...basicAnalysis, aiAnalysis };
        */

        return NextResponse.json(basicAnalysis);
    } catch (error) {
        console.error("Interview analysis error:", error);
        return NextResponse.json(
            { error: "Failed to analyze interview" },
            { status: 500 }
        );
    }
}

/* -------------------------------------------
   🔥 MAIN ANALYSIS SYSTEM
-------------------------------------------- */

function analyzeInterviewContent(transcript, questions) {
    console.log("🔥 analyzeInterviewContent() CALLED");
    console.log("📌 Raw transcript:", transcript);
    console.log("📌 Transcript type:", typeof transcript);
    console.log("📌 Transcript length:", transcript?.length);
    console.log("📌 Questions:", questions);
    console.log("📌 Questions type:", typeof questions);
    console.log("📌 Questions length:", questions?.length);

    // Check for null/undefined
    if (!transcript) {
        console.error("❌ ERROR: transcript is NULL or UNDEFINED");
        throw new Error("Transcript missing in analyzeInterviewContent()");
    }

    if (!Array.isArray(questions)) {
        console.error("❌ ERROR: questions is NOT an array:", questions);
    }

    // Splitting transcript into words
    console.log("📝 Splitting transcript into words...");
    let words;
    try {
        words = transcript.toLowerCase().split(/\s+/);
        console.log("✅ Words array created. Count:", words.length);
    } catch (err) {
        console.error("❌ ERROR while splitting transcript:", err);
        throw err;
    }

    const wordCount = words.length;

    console.log("📊 Computing metrics...");
    const metrics = {
        wordCount,
        avgWordsPerQuestion:
            questions.length > 0
                ? Math.round(wordCount / questions.length)
                : wordCount,

        fillerWords: countFillerWords(words),
        positiveWords: countPositiveWords(words),
        technicalTerms: countTechnicalTerms(words),

        sentenceComplexity: analyzeSentenceComplexity(transcript),
        speakingPace: estimateSpeakingPace(wordCount),
        clarityIssues: detectClarityProblems(transcript),

        starMethodUsage: detectSTARUsage(transcript),
    };

    console.log("📌 Metrics generated:", metrics);

    console.log("📊 Calculating scores...");
    const scores = {
        communication: scoreCommunication(metrics),
        confidence: scoreConfidence(metrics),
        content: scoreContent(metrics),
        delivery: scoreDelivery(metrics),
    };

    console.log("📌 Scores generated:", scores);

    const overallScore = Math.round(
        (scores.communication +
        scores.confidence +
        scores.content +
        scores.delivery) / 4
    );

    console.log("🎯 Overall Score:", overallScore);

    let feedback;
    try {
        console.log("📝 Generating feedback...");
        feedback = generateFullFeedback(metrics, scores, overallScore);
        console.log("✅ Feedback generated.");
    } catch (err) {
        console.error("❌ ERROR generating feedback:", err);
        throw err;
    }

    const finalOutput = {
        ...scores,
        overallScore,
        metrics,
        feedback,
        analysisDate: new Date().toISOString(),
    };

    console.log("📦 FINAL ANALYSIS OUTPUT:", finalOutput);

    return finalOutput;
}


/* -------------------------------------------
   📌 METRIC EXTRACTION FUNCTIONS
-------------------------------------------- */

function countFillerWords(words) {
    const list = ["um", "uh", "like", "you know", "actually", "basically"];
    return words.filter((w) => list.includes(w)).length;
}

function countPositiveWords(words) {
    const list = [
        "excellent",
        "great",
        "amazing",
        "successful",
        "improved",
        "enhanced",
        "optimized",
        "confident",
        "skilled",
        "experienced",
        "creative",
    ];
    return words.filter((w) => list.includes(w)).length;
}

function countTechnicalTerms(words) {
    const list = [
        "javascript",
        "python",
        "react",
        "node",
        "database",
        "api",
        "algorithm",
        "system",
        "frontend",
        "backend",
        "cloud",
    ];
    return words.filter((w) => list.includes(w)).length;
}

function analyzeSentenceComplexity(text) {
    const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);
    const avg = text.split(/\s+/).length / sentences.length;
    if (avg > 20) return "complex";
    if (avg > 12) return "moderate";
    return "simple";
}

// 🔥 NEW – speaking pace estimation
function estimateSpeakingPace(wordCount) {
    if (wordCount > 180) return "fast";
    if (wordCount < 80) return "slow";
    return "balanced";
}

// NEW – clarity issue detection
function detectClarityProblems(text) {
    const longSentences = text.split(/[.!?]/).filter((s) => s.length > 180);
    return longSentences.length > 2 ? "too long" : "good";
}

// NEW – STAR method detection (Situation, Task, Action, Result)
function detectSTARUsage(text) {
    const starKeywords = ["situation", "task", "action", "result"];
    const count = starKeywords.filter((k) => text.toLowerCase().includes(k))
        .length;
    return count >= 2 ? "used" : "not used";
}

/* -------------------------------------------
   📊 SCORING FUNCTIONS
-------------------------------------------- */

function safeRatio(dividend, divisor) {
    return divisor > 0 ? dividend / divisor : 0;
}

function scoreCommunication(m) {
    let score = 5;
    if (m.sentenceComplexity === "complex") score += 1;
    if (m.fillerWords > 10) score -= 2;
    if (m.clarityIssues === "too long") score -= 2;
    return clamp(score);
}

function scoreConfidence(m) {
    let score = 5;
    if (m.positiveWords > 4) score += 2;
    if (safeRatio(m.fillerWords, m.wordCount) > 0.1) score -= 2;
    if (m.wordCount > 150) score += 1;
    return clamp(score);
}

function scoreContent(m) {
    let score = 5;
    if (m.technicalTerms > 4) score += 2;
    if (m.avgWordsPerQuestion < 10) score -= 2;
    if (m.starMethodUsage === "used") score += 2;
    return clamp(score);
}

function scoreDelivery(m) {
    let score = 5;
    if (m.speakingPace === "balanced") score += 2;
    if (m.speakingPace === "fast") score -= 1;
    if (m.sentenceComplexity === "simple") score -= 1;
    return clamp(score);
}

function clamp(n) {
    return Math.max(1, Math.min(10, n));
}

/* -------------------------------------------
   📝 FEEDBACK GENERATOR (DETAILED)
-------------------------------------------- */

function generateFullFeedback(metrics, scores, overall) {
    let fb = [];

    fb.push(
        `Your overall performance score is **${overall}/10**, showing ${
            overall >= 8
                ? "excellent interview skills."
                : overall >= 6
                ? "strong potential with a few improvements needed."
                : "areas of improvement that will greatly boost your confidence."
        }`
    );

    fb.push(
        `### Communication (${scores.communication}/10)
You used **${metrics.wordCount} words**, with **${
            metrics.fillerWords
        } filler words**. Your sentence structure was **${
            metrics.sentenceComplexity
        }** and clarity was **${metrics.clarityIssues}**.`
    );

    fb.push(
        `### Confidence (${scores.confidence}/10)
Your usage of positive language (${metrics.positiveWords} instances) ${
            metrics.positiveWords > 3
                ? "boosted your confidence score."
                : "can be increased for a stronger impression."
        }`
    );

    fb.push(
        `### Content Quality (${scores.content}/10)
You used **${metrics.technicalTerms} technical terms**, showing ${
            metrics.technicalTerms > 3 ? "good depth." : "room for more depth."
        }
Your STAR method usage is **${metrics.starMethodUsage}**.`
    );

    fb.push(
        `### Delivery (${scores.delivery}/10)
Your speaking pace was **${metrics.speakingPace}**, and average words per question were **${metrics.avgWordsPerQuestion}**.`
    );

    fb.push(
        "### Suggestions for Improvement:\n" +
            generateSuggestions(metrics, scores).join("\n")
    );

    return fb.join("\n\n");
}

function generateSuggestions(m, s) {
    let out = [];

    if (m.fillerWords > 5) out.push("• Reduce filler words using pause techniques.");
    if (m.avgWordsPerQuestion < 15)
        out.push("• Add more examples and detail to each answer.");
    if (m.starMethodUsage === "not used")
        out.push("• Use the STAR method for behavioral answers.");
    if (m.clarityIssues === "too long")
        out.push("• Shorten sentences for better clarity.");

    if (out.length === 0) out.push("• Great job! Keep practicing for even better flow.");

    return out;
}

/* -------------------------------------------
   🤖 OPTIONAL AI ENHANCEMENT (OpenAI GPT)
-------------------------------------------- */

async function analyzeWithOpenAI(transcript, questions) {
    const prompt = `
Analyze the following interview transcript:

Transcript:
${transcript}

Questions:
${JSON.stringify(questions)}

Provide:
1. Strengths
2. Weaknesses
3. Communication analysis
4. Confidence analysis
5. Technical depth
6. Behavioral competency
7. Final recommendation
`;

    const response = await client.responses.create({
        model: "gpt-4.1",
        input: prompt,
    });

    return response.output_text;
}
