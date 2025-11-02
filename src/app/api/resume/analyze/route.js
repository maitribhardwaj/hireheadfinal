import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const resumeFile = formData.get('resume');

        if (!resumeFile) {
            return NextResponse.json(
                { error: 'No resume file provided' },
                { status: 400 }
            );
        }

        // Convert file to text for analysis
        const fileText = await resumeFile.text();

        // Get userId from form data
        const userId = formData.get('userId');
        
        // Perform real analysis on the resume content
        const analysis = await performRealResumeAnalysis(fileText, resumeFile.name);

        // Store analysis results in Firebase - ALWAYS attempt to store
        if (userId) {
            try {
                await storeResumeAnalysis(userId, analysis);
                console.log('✅ Analysis stored in Firebase for user:', userId);
                
                // Add storage confirmation to response
                analysis.storedInFirebase = true;
                analysis.storageTimestamp = new Date().toISOString();
            } catch (firebaseError) {
                console.error('❌ Failed to store analysis in Firebase:', firebaseError);
                analysis.storedInFirebase = false;
                analysis.storageError = firebaseError.message;
            }
        } else {
            console.warn('⚠️ No userId provided - analysis will not be stored');
            analysis.storedInFirebase = false;
            analysis.storageError = 'No user ID provided';
        }

        return NextResponse.json(analysis);

    } catch (error) {
        console.error('Resume analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze resume' },
            { status: 500 }
        );
    }
}

async function storeResumeAnalysis(userId, analysis) {
    try {
        console.log('💾 Attempting to store resume analysis for user:', userId);
        console.log('📊 Analysis data to store:', {
            atsScore: analysis.atsScore,
            fileName: analysis.fileName,
            hasStrengths: !!analysis.strengths,
            hasImprovements: !!analysis.improvements
        });

        // Import Firebase modules dynamically
        const { db } = await import("@/config/firebase");
        const { doc, setDoc } = await import("firebase/firestore");
        
        const resumeDoc = doc(db, 'resumeAnalyses', userId);
        
        // Prepare data for storage
        const dataToStore = {
            // Core scores
            atsScore: analysis.atsScore,
            formatScore: analysis.formatScore,
            contentScore: analysis.contentScore,
            keywordScore: analysis.keywordScore,
            
            // File info
            fileName: analysis.fileName,
            analysisDate: analysis.analysisDate,
            dataSource: analysis.dataSource,
            
            // Feedback arrays (convert to simple arrays for Firebase)
            strengths: analysis.strengths || [],
            improvements: analysis.improvements || [],
            recommendations: analysis.recommendations || [],
            
            // Detailed analysis (flatten complex objects)
            detailedAnalysis: JSON.stringify(analysis.detailedAnalysis || {}),
            industryInsights: JSON.stringify(analysis.industryInsights || []),
            
            // Metadata
            userId: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        console.log('📝 Storing data structure:', Object.keys(dataToStore));
        
        // Store the analysis with merge option (overwrites previous analysis)
        await setDoc(resumeDoc, dataToStore, { merge: false }); // Use merge: false to completely replace
        
        console.log('✅ Resume analysis successfully stored in Firebase for user:', userId);
        
        // Verify the data was stored by reading it back
        const { getDoc } = await import("firebase/firestore");
        const verifyDoc = await getDoc(resumeDoc);
        if (verifyDoc.exists()) {
            const storedData = verifyDoc.data();
            console.log('✅ Verification: Data exists in Firebase with ATS score:', storedData.atsScore);
            console.log('📊 Stored data summary:', {
                atsScore: storedData.atsScore,
                fileName: storedData.fileName,
                analysisDate: storedData.analysisDate,
                strengthsCount: storedData.strengths?.length || 0,
                improvementsCount: storedData.improvements?.length || 0
            });
        } else {
            console.log('❌ Verification failed: Document not found after storage');
            throw new Error('Failed to verify data storage');
        }
        
    } catch (error) {
        console.error('❌ Error storing resume analysis:', error);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        throw error;
    }
}

async function performRealResumeAnalysis(resumeText, fileName) {
    console.log('🔍 Performing real analysis on resume:', fileName);

    // Parse resume content
    const parsedData = parseResumeContent(resumeText);

    // Generate dynamic analysis with varied feedback
    const analysis = {
        fileName: fileName,
        atsScore: calculateDynamicATSScore(parsedData),
        formatScore: calculateDynamicFormatScore(parsedData),
        contentScore: calculateDynamicContentScore(parsedData),
        keywordScore: calculateDynamicKeywordScore(parsedData),
        strengths: generateDynamicStrengths(parsedData),
        improvements: generateDynamicImprovements(parsedData),
        recommendations: generateDynamicRecommendations(parsedData),
        detailedAnalysis: generateDetailedAnalysis(parsedData),
        industryInsights: generateIndustryInsights(parsedData),
        analysisDate: new Date().toISOString(),
        dataSource: 'Real Content Analysis'
    };

    return analysis;
}

function parseResumeContent(text) {
    const lowerText = text.toLowerCase();

    return {
        hasEmail: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text),
        hasPhone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text),
        hasLinkedIn: lowerText.includes('linkedin') || lowerText.includes('linked.in'),
        hasGitHub: lowerText.includes('github') || lowerText.includes('git.hub'),

        // Experience indicators
        experienceKeywords: countMatches(lowerText, [
            'experience', 'worked', 'developed', 'managed', 'led', 'created',
            'implemented', 'designed', 'built', 'maintained', 'coordinated'
        ]),

        // Skills detection
        technicalSkills: countMatches(lowerText, [
            'javascript', 'python', 'java', 'react', 'node', 'sql', 'aws',
            'docker', 'kubernetes', 'git', 'html', 'css', 'typescript',
            'mongodb', 'postgresql', 'redis', 'graphql', 'rest api'
        ]),

        softSkills: countMatches(lowerText, [
            'leadership', 'communication', 'teamwork', 'problem solving',
            'analytical', 'creative', 'adaptable', 'collaborative'
        ]),

        // Education indicators
        hasEducation: lowerText.includes('education') || lowerText.includes('degree') ||
            lowerText.includes('university') || lowerText.includes('college'),

        // Quantifiable achievements
        hasNumbers: /\d+%|\d+\+|\$\d+|increased|decreased|improved|reduced/.test(lowerText),

        // Action verbs
        actionVerbs: countMatches(lowerText, [
            'achieved', 'accomplished', 'delivered', 'exceeded', 'optimized',
            'streamlined', 'enhanced', 'transformed', 'pioneered', 'spearheaded'
        ]),

        // Professional sections
        hasSummary: lowerText.includes('summary') || lowerText.includes('objective') ||
            lowerText.includes('profile'),

        wordCount: text.split(/\s+/).length,
        originalText: text
    };
}

function countMatches(text, keywords) {
    return keywords.reduce((count, keyword) => {
        return count + (text.includes(keyword) ? 1 : 0);
    }, 0);
}

function calculateDynamicATSScore(data) {
    let score = 45 + Math.floor(Math.random() * 10); // Base score with variation

    // Contact information (critical for ATS)
    if (data.hasEmail) score += 12;
    if (data.hasPhone) score += 8;
    if (data.hasLinkedIn) score += 5;

    // Technical skills boost
    if (data.technicalSkills >= 8) score += 15;
    else if (data.technicalSkills >= 5) score += 10;
    else if (data.technicalSkills >= 3) score += 5;

    // Experience indicators
    if (data.experienceKeywords >= 10) score += 12;
    else if (data.experienceKeywords >= 6) score += 8;
    else if (data.experienceKeywords >= 3) score += 4;

    // Education
    if (data.hasEducation) score += 6;

    // Professional summary
    if (data.hasSummary) score += 4;

    return Math.min(95, Math.max(35, score));
}

function calculateDynamicFormatScore(data) {
    let score = 55 + Math.floor(Math.random() * 15); // Base with variation

    // Word count analysis (optimal range)
    if (data.wordCount >= 300 && data.wordCount <= 800) score += 15;
    else if (data.wordCount >= 200 && data.wordCount <= 1000) score += 10;
    else score += 5;

    // Contact completeness
    if (data.hasEmail && data.hasPhone) score += 10;
    if (data.hasLinkedIn || data.hasGitHub) score += 5;

    // Professional structure
    if (data.hasSummary) score += 8;
    if (data.hasEducation) score += 7;

    return Math.min(92, Math.max(40, score));
}

function calculateDynamicContentScore(data) {
    let score = 50 + Math.floor(Math.random() * 12); // Base with variation

    // Experience depth
    if (data.experienceKeywords >= 12) score += 20;
    else if (data.experienceKeywords >= 8) score += 15;
    else if (data.experienceKeywords >= 4) score += 10;

    // Skills diversity
    const totalSkills = data.technicalSkills + data.softSkills;
    if (totalSkills >= 12) score += 15;
    else if (totalSkills >= 8) score += 10;
    else if (totalSkills >= 5) score += 5;

    // Quantifiable achievements
    if (data.hasNumbers) score += 10;

    // Action-oriented language
    if (data.actionVerbs >= 6) score += 8;
    else if (data.actionVerbs >= 3) score += 5;

    return Math.min(94, Math.max(45, score));
}

function calculateDynamicKeywordScore(data) {
    let score = 40 + Math.floor(Math.random() * 10); // Base with variation

    // Technical keyword density
    if (data.technicalSkills >= 10) score += 25;
    else if (data.technicalSkills >= 6) score += 18;
    else if (data.technicalSkills >= 3) score += 12;

    // Soft skills presence
    if (data.softSkills >= 4) score += 15;
    else if (data.softSkills >= 2) score += 10;

    // Action verbs usage
    if (data.actionVerbs >= 5) score += 12;
    else if (data.actionVerbs >= 3) score += 8;

    // Industry relevance
    if (data.hasGitHub) score += 5; // Tech industry indicator

    return Math.min(96, Math.max(35, score));
}

function generateDynamicStrengths(data) {
    const allStrengths = [
        // Contact & Professional Presence
        { condition: data.hasEmail && data.hasPhone, text: "Complete and professional contact information" },
        { condition: data.hasLinkedIn, text: "LinkedIn profile demonstrates professional networking" },
        { condition: data.hasGitHub, text: "GitHub presence shows technical project involvement" },

        // Technical Competency
        { condition: data.technicalSkills >= 8, text: "Impressive breadth of technical skills and technologies" },
        { condition: data.technicalSkills >= 5, text: "Strong foundation in relevant technical skills" },
        { condition: data.technicalSkills >= 3, text: "Good technical skill set for the industry" },

        // Experience & Achievement
        { condition: data.experienceKeywords >= 10, text: "Rich professional experience with diverse responsibilities" },
        { condition: data.experienceKeywords >= 6, text: "Solid work experience with clear role progression" },
        { condition: data.hasNumbers, text: "Quantified achievements demonstrate measurable impact" },
        { condition: data.actionVerbs >= 5, text: "Strong use of action-oriented language throughout" },

        // Content Quality
        { condition: data.hasSummary, text: "Professional summary provides clear career focus" },
        { condition: data.hasEducation, text: "Educational background supports career objectives" },
        { condition: data.softSkills >= 3, text: "Well-rounded with both technical and soft skills" },
        { condition: data.wordCount >= 400 && data.wordCount <= 700, text: "Optimal resume length for comprehensive yet concise presentation" },

        // Additional strengths (randomly selected for variety)
        { condition: Math.random() > 0.7, text: "Clear and organized information hierarchy" },
        { condition: Math.random() > 0.8, text: "Industry-relevant terminology used effectively" },
        { condition: Math.random() > 0.6, text: "Professional tone maintained throughout document" }
    ];

    // Filter and return applicable strengths
    const applicableStrengths = allStrengths
        .filter(strength => strength.condition)
        .map(strength => strength.text);

    // Ensure we have at least 3-5 strengths
    if (applicableStrengths.length < 3) {
        applicableStrengths.push(
            "Resume demonstrates professional presentation",
            "Clear structure makes information easily accessible",
            "Relevant content aligned with career goals"
        );
    }

    return applicableStrengths.slice(0, 6); // Limit to 6 strengths
}

function generateDynamicImprovements(data) {
    const allImprovements = [
        // Contact & Professional Presence
        { condition: !data.hasEmail, text: "Add a professional email address for contact" },
        { condition: !data.hasPhone, text: "Include a phone number for direct communication" },
        { condition: !data.hasLinkedIn, text: "Add LinkedIn profile URL to enhance professional presence" },
        { condition: !data.hasGitHub && data.technicalSkills > 3, text: "Include GitHub profile to showcase technical projects" },

        // Content Depth
        { condition: data.experienceKeywords < 6, text: "Expand work experience with more detailed accomplishments" },
        { condition: data.technicalSkills < 5, text: "Include more relevant technical skills and technologies" },
        { condition: data.softSkills < 2, text: "Highlight soft skills like leadership, communication, and teamwork" },
        { condition: !data.hasNumbers, text: "Add quantifiable achievements with specific numbers and percentages" },

        // Structure & Format
        { condition: !data.hasSummary, text: "Include a professional summary to highlight key qualifications" },
        { condition: !data.hasEducation, text: "Add educational background and relevant certifications" },
        { condition: data.actionVerbs < 4, text: "Use more action verbs to start bullet points (e.g., 'Developed', 'Led', 'Implemented')" },
        { condition: data.wordCount < 300, text: "Expand content to provide more comprehensive career overview" },
        { condition: data.wordCount > 900, text: "Condense content to maintain recruiter attention and readability" },

        // Industry-Specific (randomly selected for variety)
        { condition: Math.random() > 0.6, text: "Tailor keywords to match specific job descriptions you're targeting" },
        { condition: Math.random() > 0.7, text: "Include relevant industry certifications or training programs" },
        { condition: Math.random() > 0.8, text: "Add volunteer work or side projects that demonstrate additional skills" },
        { condition: Math.random() > 0.5, text: "Use consistent formatting for dates, locations, and job titles" },
        { condition: Math.random() > 0.6, text: "Consider adding a 'Key Achievements' or 'Notable Projects' section" }
    ];

    // Filter and return applicable improvements
    const applicableImprovements = allImprovements
        .filter(improvement => improvement.condition)
        .map(improvement => improvement.text);

    // Ensure we have at least 3-4 improvements
    if (applicableImprovements.length < 3) {
        applicableImprovements.push(
            "Proofread for spelling and grammatical errors",
            "Ensure consistent formatting throughout the document",
            "Optimize white space and margins for better readability"
        );
    }

    return applicableImprovements.slice(0, 5); // Limit to 5 improvements
}

function generateDynamicRecommendations(data) {
    const allRecommendations = [
        // Always applicable recommendations
        "Use strong action verbs to begin each bullet point (e.g., 'Spearheaded', 'Optimized', 'Architected')",
        "Quantify achievements wherever possible with specific metrics and percentages",
        "Tailor your resume keywords to match each job description you apply for",

        // Conditionally applicable recommendations
        { condition: data.technicalSkills >= 5, text: "Create a dedicated 'Technical Skills' section to highlight your expertise" },
        { condition: data.hasGitHub, text: "Include links to your most impressive GitHub repositories" },
        { condition: data.experienceKeywords >= 8, text: "Consider using a reverse-chronological format to showcase career progression" },
        { condition: data.wordCount > 600, text: "Use bullet points instead of paragraphs for better readability" },
        { condition: !data.hasLinkedIn, text: "Create a professional LinkedIn profile and include the URL" },

        // Industry-specific recommendations (randomly selected)
        { condition: Math.random() > 0.5, text: "Use industry-standard terminology and acronyms relevant to your field" },
        { condition: Math.random() > 0.6, text: "Include relevant certifications, licenses, or professional memberships" },
        { condition: Math.random() > 0.7, text: "Consider adding a 'Projects' section to showcase practical applications of your skills" },
        { condition: Math.random() > 0.4, text: "Ensure your resume is ATS-friendly by using standard fonts and avoiding graphics" },
        { condition: Math.random() > 0.8, text: "Include volunteer work or community involvement that demonstrates leadership" },
        { condition: Math.random() > 0.3, text: "Keep your resume to 1-2 pages maximum for optimal recruiter attention" }
    ];

    // Process recommendations
    const recommendations = [];

    allRecommendations.forEach(rec => {
        if (typeof rec === 'string') {
            recommendations.push(rec);
        } else if (rec.condition) {
            recommendations.push(rec.text);
        }
    });

    // Add fallback recommendations if needed
    if (recommendations.length < 5) {
        const fallbacks = [
            "Proofread carefully for spelling and grammatical errors",
            "Use consistent formatting for dates, locations, and contact information",
            "Choose a clean, professional font like Arial, Calibri, or Times New Roman",
            "Maintain consistent margins and spacing throughout the document"
        ];

        fallbacks.forEach(fallback => {
            if (recommendations.length < 8 && !recommendations.includes(fallback)) {
                recommendations.push(fallback);
            }
        });
    }

    return recommendations.slice(0, 8); // Limit to 8 recommendations
}

function generateDetailedAnalysis(data) {
    const analysis = {
        contactInfo: {
            score: (data.hasEmail ? 40 : 0) + (data.hasPhone ? 30 : 0) + (data.hasLinkedIn ? 20 : 0) + (data.hasGitHub ? 10 : 0),
            feedback: data.hasEmail && data.hasPhone ?
                "Excellent contact information coverage" :
                "Missing key contact details that recruiters need"
        },

        skillsAnalysis: {
            technicalCount: data.technicalSkills,
            softCount: data.softSkills,
            feedback: data.technicalSkills >= 5 ?
                "Strong technical skill representation" :
                "Consider expanding your technical skills section"
        },

        experienceDepth: {
            keywordCount: data.experienceKeywords,
            hasQuantifiableResults: data.hasNumbers,
            feedback: data.experienceKeywords >= 8 ?
                "Rich experience description with good depth" :
                "Experience section could benefit from more detailed descriptions"
        },

        professionalPresentation: {
            wordCount: data.wordCount,
            hasStructure: data.hasSummary,
            feedback: data.wordCount >= 300 && data.wordCount <= 800 ?
                "Well-balanced content length" :
                data.wordCount < 300 ? "Content appears too brief" : "Content may be too lengthy"
        }
    };

    return analysis;
}

function generateIndustryInsights(data) {
    const insights = [];

    // Tech industry insights
    if (data.technicalSkills >= 3) {
        insights.push({
            category: "Technology Sector",
            insight: "Your technical skills align well with current market demands",
            recommendation: "Consider highlighting cloud technologies and modern frameworks"
        });
    }

    // General professional insights
    if (data.hasLinkedIn && data.hasGitHub) {
        insights.push({
            category: "Professional Networking",
            insight: "Strong online professional presence detected",
            recommendation: "Leverage your online profiles to build industry connections"
        });
    }

    // Experience level insights
    if (data.experienceKeywords >= 10) {
        insights.push({
            category: "Career Level",
            insight: "Resume indicates senior-level experience",
            recommendation: "Focus on leadership achievements and strategic contributions"
        });
    } else if (data.experienceKeywords >= 5) {
        insights.push({
            category: "Career Level",
            insight: "Resume shows mid-level professional experience",
            recommendation: "Highlight growth trajectory and increasing responsibilities"
        });
    }

    // Add random industry insight for variety
    const randomInsights = [
        {
            category: "Market Trends",
            insight: "Remote work capabilities are increasingly valued",
            recommendation: "Highlight any remote work experience or digital collaboration skills"
        },
        {
            category: "Skills Evolution",
            insight: "Continuous learning is essential in today's job market",
            recommendation: "Include recent training, certifications, or self-directed learning"
        },
        {
            category: "Personal Branding",
            insight: "Professional storytelling sets candidates apart",
            recommendation: "Craft a compelling narrative that connects your experiences"
        }
    ];

    if (Math.random() > 0.5 && insights.length < 3) {
        const randomIndex = Math.floor(Math.random() * randomInsights.length);
        insights.push(randomInsights[randomIndex]);
    }

    return insights;
}