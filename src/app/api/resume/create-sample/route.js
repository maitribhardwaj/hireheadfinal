import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Create sample resume analysis data
        const sampleAnalysis = {
            atsScore: 85,
            formatScore: 78,
            contentScore: 82,
            keywordScore: 88,
            fileName: 'sample-resume.pdf',
            analysisDate: new Date().toISOString(),
            dataSource: 'Sample Data',
            strengths: [
                'Strong technical skills representation',
                'Professional contact information',
                'Quantified achievements present'
            ],
            improvements: [
                'Add more action verbs',
                'Include LinkedIn profile',
                'Expand work experience details'
            ],
            recommendations: [
                'Use stronger action verbs to start bullet points',
                'Quantify achievements with specific numbers',
                'Tailor keywords to match job descriptions'
            ],
            detailedAnalysis: JSON.stringify({
                contactInfo: {
                    score: 90,
                    feedback: 'Excellent contact information coverage'
                },
                skillsAnalysis: {
                    technicalCount: 8,
                    softCount: 3,
                    feedback: 'Strong technical skill representation'
                }
            }),
            industryInsights: JSON.stringify([
                {
                    category: 'Technology Sector',
                    insight: 'Your technical skills align well with current market demands',
                    recommendation: 'Consider highlighting cloud technologies'
                }
            ]),
            userId: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            // Import Firebase modules dynamically
            const { db } = await import("../../../config/firebase");
            const { doc, setDoc } = await import("firebase/firestore");
            
            const resumeDoc = doc(db, 'resumeAnalyses', userId);
            
            // Store the sample analysis
            await setDoc(resumeDoc, sampleAnalysis);
            
            console.log('✅ Sample resume analysis created for user:', userId);
            
            return NextResponse.json({
                success: true,
                message: 'Sample resume analysis created successfully',
                data: sampleAnalysis
            });
            
        } catch (firebaseError) {
            console.error('❌ Firebase error:', firebaseError);
            return NextResponse.json({
                success: false,
                error: 'Failed to store sample data in Firebase'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('❌ Error creating sample resume analysis:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create sample data' },
            { status: 500 }
        );
    }
}