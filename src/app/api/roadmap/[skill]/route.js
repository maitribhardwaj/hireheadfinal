import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const { skill } = params;
        
        // Map our skill IDs to roadmap.sh paths
        const roadmapMapping = {
            'frontend': 'frontend',
            'backend': 'backend',
            'fullstack': 'full-stack',
            'mobile': 'react-native',
            'data-science': 'data-scientist',
            'machine-learning': 'ai-data-scientist',
            'ai-engineering': 'ai-engineer',
            'devops': 'devops',
            'cybersecurity': 'cyber-security',
            'ui-ux': 'ux-design',
            'product-management': 'product-manager',
            'digital-marketing': 'digital-marketing'
        };

        const roadmapPath = roadmapMapping[skill];
        if (!roadmapPath) {
            return NextResponse.json(
                { error: 'Roadmap not found' },
                { status: 404 }
            );
        }

        // Fetch roadmap data from GitHub API
        let roadmapContent = null;
        let roadmapData = null;

        try {
            console.log(`🔍 Fetching roadmaps list from GitHub...`);
            
            // First, get the list of available roadmaps
            const roadmapsListUrl = 'https://api.github.com/repos/kamranahmedse/developer-roadmap/contents/roadmaps';
            const listResponse = await fetch(roadmapsListUrl, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Roadmap-Learning-App'
                }
            });

            if (listResponse.ok) {
                const roadmapsList = await listResponse.json();
                console.log(`📋 Found ${roadmapsList.length} roadmaps in repository`);
                
                // Find the matching roadmap folder
                const matchingRoadmap = roadmapsList.find(item => 
                    item.type === 'dir' && 
                    (item.name === roadmapPath || 
                     item.name.includes(roadmapPath) ||
                     roadmapPath.includes(item.name))
                );

                if (matchingRoadmap) {
                    console.log(`🎯 Found matching roadmap: ${matchingRoadmap.name}`);
                    
                    // Fetch the roadmap folder contents
                    const folderResponse = await fetch(matchingRoadmap.url, {
                        headers: {
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'Roadmap-Learning-App'
                        }
                    });

                    if (folderResponse.ok) {
                        const folderContents = await folderResponse.json();
                        console.log(`📁 Roadmap folder contains ${folderContents.length} items`);
                        
                        // Look for README.md or similar files
                        const readmeFile = folderContents.find(file => 
                            file.type === 'file' && (
                                file.name.toLowerCase() === 'readme.md' || 
                                file.name.toLowerCase() === 'roadmap.md' ||
                                file.name.toLowerCase().includes('roadmap') ||
                                file.name.toLowerCase().includes('content')
                            )
                        );

                        if (readmeFile) {
                            console.log(`📄 Found content file: ${readmeFile.name}`);
                            
                            const fileResponse = await fetch(readmeFile.url, {
                                headers: {
                                    'Accept': 'application/vnd.github.v3+json',
                                    'User-Agent': 'Roadmap-Learning-App'
                                }
                            });

                            if (fileResponse.ok) {
                                const fileData = await fileResponse.json();
                                // Decode base64 content
                                roadmapContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
                                
                                // Parse the markdown content to extract roadmap structure
                                roadmapData = parseRoadmapContent(roadmapContent, skill, matchingRoadmap.name);
                                console.log(`✅ Successfully parsed roadmap content`);
                            }
                        } else {
                            console.log(`❌ No content file found in ${matchingRoadmap.name}`);
                            console.log('Available files:', folderContents.map(f => f.name));
                        }
                    }
                } else {
                    console.log(`❌ No matching roadmap found for: ${roadmapPath}`);
                    console.log('Available roadmaps:', roadmapsList.filter(item => item.type === 'dir').map(item => item.name));
                }
            } else {
                console.log(`❌ Failed to fetch roadmaps list: ${listResponse.status}`);
            }
        } catch (fetchError) {
            console.log('❌ GitHub API error:', fetchError.message);
        }

        // If we couldn't fetch from GitHub, use our curated data
        if (!roadmapData) {
            console.log('📚 Using fallback roadmap data');
            roadmapData = getFallbackRoadmapData(skill);
        }

        return NextResponse.json({
            success: true,
            data: roadmapData,
            source: roadmapContent ? 'roadmap.sh' : 'fallback'
        });

    } catch (error) {
        console.error('❌ Error fetching roadmap:', error);

        // Return fallback data on error
        return NextResponse.json({
            success: true,
            data: getFallbackRoadmapData(params.skill),
            source: 'fallback'
        });
    }
}

function parseRoadmapContent(content, skillId, roadmapName) {
    console.log(`🔧 Parsing roadmap content for ${skillId}`);
    
    // Parse markdown content and extract roadmap structure
    const lines = content.split('\n');
    const roadmapData = {
        title: getSkillTitle(skillId),
        description: `Comprehensive ${getSkillTitle(skillId)} learning path from roadmap.sh`,
        difficulty: 'Intermediate',
        duration: '6-12 months',
        phases: []
    };

    let currentPhase = null;
    let currentStep = null;
    let phaseCounter = 1;
    let stepCounter = 1;

    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines and metadata
        if (!trimmedLine || trimmedLine.startsWith('---') || trimmedLine.startsWith('<!--')) {
            continue;
        }
        
        // Detect main sections (## headers) - these become phases
        if (trimmedLine.startsWith('## ') && !trimmedLine.toLowerCase().includes('introduction') && !trimmedLine.toLowerCase().includes('table of contents')) {
            if (currentPhase && currentPhase.steps.length > 0) {
                roadmapData.phases.push(currentPhase);
            }
            
            const phaseTitle = trimmedLine.replace('## ', '').replace(/[^\w\s]/g, '').trim();
            currentPhase = {
                id: phaseCounter++,
                title: phaseTitle,
                description: `Master ${phaseTitle.toLowerCase()} concepts and skills`,
                steps: []
            };
            stepCounter = 1;
        }
        
        // Detect subsections (### headers) as steps
        else if (trimmedLine.startsWith('### ') && currentPhase) {
            if (currentStep && currentStep.title) {
                currentPhase.steps.push(currentStep);
            }
            
            const stepTitle = trimmedLine.replace('### ', '').replace(/[^\w\s]/g, '').trim();
            currentStep = {
                id: stepCounter++,
                title: stepTitle,
                description: `Learn and practice ${stepTitle.toLowerCase()}`,
                duration: getDynamicDuration(),
                difficulty: getDynamicDifficulty(),
                resources: [],
                projects: []
            };
        }
        
        // Detect bullet points as resources
        else if (trimmedLine.startsWith('- ') && currentStep) {
            const resource = trimmedLine.replace('- ', '').replace(/\[.*?\]\(.*?\)/g, '').trim();
            if (resource.length > 0 && resource.length < 100) {
                currentStep.resources.push(resource);
            }
        }
        
        // Detect numbered lists as additional resources
        else if (/^\d+\.\s/.test(trimmedLine) && currentStep) {
            const resource = trimmedLine.replace(/^\d+\.\s/, '').replace(/\[.*?\]\(.*?\)/g, '').trim();
            if (resource.length > 0 && resource.length < 100) {
                currentStep.resources.push(resource);
            }
        }
    }

    // Add the last step and phase
    if (currentStep && currentStep.title && currentPhase) {
        currentPhase.steps.push(currentStep);
    }
    if (currentPhase && currentPhase.steps.length > 0) {
        roadmapData.phases.push(currentPhase);
    }

    // Add default projects and ensure minimum content
    roadmapData.phases.forEach(phase => {
        phase.steps.forEach(step => {
            if (step.projects.length === 0) {
                step.projects = generateDefaultProjects(step.title, skillId);
            }
            if (step.resources.length === 0) {
                step.resources = generateDefaultResources(step.title, skillId);
            }
            // Limit resources to avoid overwhelming users
            step.resources = step.resources.slice(0, 5);
        });
    });

    // Ensure we have at least some content
    if (roadmapData.phases.length === 0) {
        roadmapData.phases = generateMinimalPhases(skillId);
    }

    console.log(`✅ Parsed ${roadmapData.phases.length} phases with ${roadmapData.phases.reduce((acc, p) => acc + p.steps.length, 0)} total steps`);
    return roadmapData;
}

function getDynamicDuration() {
    const durations = ['1-2 weeks', '2-3 weeks', '3-4 weeks', '1 month', '2 months'];
    return durations[Math.floor(Math.random() * durations.length)];
}

function getDynamicDifficulty() {
    const difficulties = ['Beginner', 'Intermediate', 'Advanced'];
    return difficulties[Math.floor(Math.random() * difficulties.length)];
}

function generateDefaultProjects(stepTitle, skillId) {
    const projectTemplates = {
        'frontend': [
            'Interactive Component Library',
            'Responsive Web Application',
            'Performance Optimized Site'
        ],
        'backend': [
            'REST API Service',
            'Database Integration Project',
            'Authentication System'
        ],
        'fullstack': [
            'Full Stack Web App',
            'Real-time Chat Application',
            'E-commerce Platform'
        ],
        'mobile': [
            'Cross-platform Mobile App',
            'Native Feature Integration',
            'App Store Deployment'
        ],
        'data-science': [
            'Data Analysis Dashboard',
            'Machine Learning Model',
            'Data Visualization Project'
        ]
    };

    const defaultProjects = projectTemplates[skillId] || [
        'Hands-on Practice Project',
        'Real-world Application',
        'Portfolio Showcase'
    ];

    return [defaultProjects[Math.floor(Math.random() * defaultProjects.length)]];
}

function generateDefaultResources(stepTitle, skillId) {
    return [
        'Official Documentation',
        'Interactive Tutorial',
        'Video Course',
        'Practice Exercises',
        'Community Guide'
    ];
}

function generateMinimalPhases(skillId) {
    return [
        {
            id: 1,
            title: 'Getting Started',
            description: 'Build your foundation in this skill area',
            steps: [
                {
                    id: 1,
                    title: 'Fundamentals',
                    description: 'Learn the core concepts and principles',
                    duration: '4 weeks',
                    difficulty: 'Beginner',
                    resources: ['Official Documentation', 'Online Courses', 'Community Resources'],
                    projects: ['Basic Implementation', 'Hands-on Practice Project']
                }
            ]
        }
    ];
}

function getSkillTitle(skillId) {
    const titles = {
        'frontend': 'Frontend Development',
        'backend': 'Backend Development',
        'fullstack': 'Full Stack Development',
        'mobile': 'Mobile Development',
        'data-science': 'Data Science',
        'machine-learning': 'Machine Learning',
        'ai-engineering': 'AI Engineering',
        'devops': 'DevOps Engineering',
        'cybersecurity': 'Cybersecurity',
        'ui-ux': 'UI/UX Design',
        'product-management': 'Product Management',
        'digital-marketing': 'Digital Marketing'
    };
    return titles[skillId] || 'Unknown Skill';
}

function getFallbackRoadmapData(skillId) {
    // Curated fallback data based on industry standards
    const fallbackData = {
        'frontend': {
            title: 'Frontend Development',
            description: 'Master modern frontend development with HTML, CSS, JavaScript, and popular frameworks',
            difficulty: 'Beginner',
            duration: '4-6 months',
            phases: [
                {
                    id: 1,
                    title: 'Web Fundamentals',
                    description: 'Build strong foundation in web technologies',
                    steps: [
                        {
                            id: 1,
                            title: 'HTML & Semantic Markup',
                            description: 'Learn HTML5, semantic elements, accessibility, and best practices',
                            duration: '2 weeks',
                            difficulty: 'Beginner',
                            resources: ['MDN HTML Guide', 'HTML5 Specification', 'Web Accessibility Guidelines'],
                            projects: ['Personal Portfolio Website', 'Semantic Blog Layout']
                        },
                        {
                            id: 2,
                            title: 'CSS & Responsive Design',
                            description: 'Master CSS3, Flexbox, Grid, and responsive design principles',
                            duration: '3 weeks',
                            difficulty: 'Beginner',
                            resources: ['CSS-Tricks', 'Flexbox Froggy', 'Grid Garden', 'Responsive Web Design'],
                            projects: ['Responsive Landing Page', 'CSS Art Project', 'Mobile-First Design']
                        },
                        {
                            id: 3,
                            title: 'JavaScript Fundamentals',
                            description: 'Learn ES6+, DOM manipulation, events, and async programming',
                            duration: '4 weeks',
                            difficulty: 'Intermediate',
                            resources: ['JavaScript.info', 'Eloquent JavaScript', 'MDN JavaScript Guide'],
                            projects: ['Interactive Todo App', 'Weather Dashboard', 'JavaScript Calculator']
                        }
                    ]
                },
                {
                    id: 2,
                    title: 'Modern Frontend',
                    description: 'Learn modern frameworks and development tools',
                    steps: [
                        {
                            id: 4,
                            title: 'React.js Ecosystem',
                            description: 'Components, hooks, state management, and React ecosystem',
                            duration: '5 weeks',
                            difficulty: 'Intermediate',
                            resources: ['React Official Docs', 'React Hooks Guide', 'React Router', 'Create React App'],
                            projects: ['Movie Database App', 'E-commerce Product Catalog', 'Social Media Dashboard']
                        },
                        {
                            id: 5,
                            title: 'Build Tools & Workflow',
                            description: 'Webpack, Vite, npm/yarn, and modern development workflow',
                            duration: '2 weeks',
                            difficulty: 'Intermediate',
                            resources: ['Webpack Documentation', 'Vite Guide', 'npm Best Practices'],
                            projects: ['Custom Build Configuration', 'Multi-environment Setup']
                        }
                    ]
                }
            ]
        }
    };

    return fallbackData[skillId] || {
        title: getSkillTitle(skillId),
        description: `Comprehensive learning path for ${getSkillTitle(skillId)}`,
        difficulty: 'Intermediate',
        duration: '6-8 months',
        phases: generateMinimalPhases(skillId)
    };
}