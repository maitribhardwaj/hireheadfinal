import { NextResponse } from 'next/server';

// In-memory storage for demo purposes
// In production, this would use a proper database
let savedScores = new Map();

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, analysis } = body;

        if (!userId || !analysis) {
            return NextResponse.json(
                { error: 'User ID and analysis data are required' },
                { status: 400 }
            );
        }

        // Create a clean analysis object for storage
        const scoreData = {
            fileName: analysis.fileName,
            atsScore: analysis.atsScore,
            formatScore: analysis.formatScore,
            contentScore: analysis.contentScore,
            keywordScore: analysis.keywordScore,
            strengths: analysis.strengths || [],
            improvements: analysis.improvements || [],
            recommendations: analysis.recommendations || [],
            dataSource: analysis.dataSource,
            analysisDate: analysis.analysisDate,
            savedAt: new Date().toISOString(),
            userId: userId
        };

        // Save to in-memory storage (replace with database in production)
        savedScores.set(userId, scoreData);

        console.log('✅ Resume score saved for user:', userId);

        return NextResponse.json({
            success: true,
            message: 'Resume score saved successfully'
        });

    } catch (error) {
        console.error('❌ Error saving resume score:', error);
        return NextResponse.json(
            { error: 'Failed to save resume score' },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Get from in-memory storage (replace with database in production)
        const savedScore = savedScores.get(userId);

        return NextResponse.json({
            success: true,
            data: savedScore || null
        });

    } catch (error) {
        console.error('❌ Error fetching resume score:', error);
        return NextResponse.json(
            { error: 'Failed to fetch resume score' },
            { status: 500 }
        );
    }
}