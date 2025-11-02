import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        console.log('🧪 Testing Firebase save functionality...');
        
        const { userId } = await request.json();
        
        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        // Import Firebase modules dynamically
        const { db } = await import("@/config/firebase");
        const { doc, setDoc, getDoc } = await import("firebase/firestore");
        
        console.log('✅ Firebase modules imported successfully');
        
        // Test data
        const testData = {
            atsScore: 85,
            fileName: 'test-resume.pdf',
            analysisDate: new Date().toISOString(),
            testField: 'This is a test',
            createdAt: new Date().toISOString()
        };
        
        console.log('📝 Attempting to save test data:', testData);
        
        // Create document reference
        const testDoc = doc(db, 'resumeAnalyses', userId);
        
        // Save the test data
        await setDoc(testDoc, testData);
        
        console.log('✅ Test data saved successfully');
        
        // Verify by reading it back
        const docSnap = await getDoc(testDoc);
        
        if (docSnap.exists()) {
            const retrievedData = docSnap.data();
            console.log('✅ Test data retrieved successfully:', retrievedData);
            
            return NextResponse.json({
                success: true,
                message: 'Firebase save test successful',
                savedData: testData,
                retrievedData: retrievedData
            });
        } else {
            console.log('❌ Document not found after saving');
            return NextResponse.json({
                success: false,
                error: 'Document not found after saving'
            }, { status: 500 });
        }
        
    } catch (error) {
        console.error('❌ Firebase save test failed:', error);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        return NextResponse.json({
            success: false,
            error: error.message,
            code: error.code
        }, { status: 500 });
    }
}