import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID is required' },
                { status: 400 }
            );
        }

        try {
            // Import Firebase modules dynamically
            const { db } = await import("@/config/firebase");
            const { doc, getDoc } = await import("firebase/firestore");
            
            const resumeDoc = doc(db, 'resumeAnalyses', userId);
            const docSnap = await getDoc(resumeDoc);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('✅ Resume analysis found for user:', userId);
                console.log('📊 Retrieved ATS score:', data.atsScore);
                
                // Parse JSON fields back to objects
                const processedData = {
                    ...data,
                    detailedAnalysis: data.detailedAnalysis ? JSON.parse(data.detailedAnalysis) : {},
                    industryInsights: data.industryInsights ? JSON.parse(data.industryInsights) : []
                };
                
                return NextResponse.json({
                    success: true,
                    data: processedData
                });
            } else {
                console.log('📝 No resume analysis found for user:', userId);
                return NextResponse.json({
                    success: false,
                    error: 'No resume analysis found'
                });
            }
        } catch (firebaseError) {
            console.error('❌ Firebase error:', firebaseError);
            return NextResponse.json({
                success: false,
                error: 'Database connection failed'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('❌ Error fetching resume analysis:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch resume analysis' },
            { status: 500 }
        );
    }
}