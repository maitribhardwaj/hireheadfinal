import { NextResponse } from 'next/server';
import https from 'https';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || 'developer';
    const location = searchParams.get('location') || '';
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';

    const apiKey = process.env.FINDWORK_API_KEY;
    
    if (!apiKey) {
        console.error('❌ FindWork API key not found');
        return NextResponse.json({
            success: true,
            data: {
                jobs: getFallbackJobs(query, location),
                total: 6,
                page: parseInt(page),
                totalPages: 1
            },
            fallback: true,
            message: 'API key not configured - showing sample jobs'
        });
    }

    try {
        console.log('🔍 Searching FindWork API for:', query, location ? `in ${location}` : '');

        // Make request to FindWork API
        const result = await makeFindWorkRequest(query, location, page, apiKey);
        
        if (!result || !result.results || result.results.length === 0) {
            console.log('⚠️ No jobs found, returning fallback');
            return NextResponse.json({
                success: true,
                data: {
                    jobs: getFallbackJobs(query, location),
                    total: 6,
                    page: parseInt(page),
                    totalPages: 1
                },
                fallback: true,
                message: 'No jobs found - showing sample jobs'
            });
        }

        // Transform and return real jobs
        const transformedJobs = transformFindWorkData(result.results);
        console.log('✅ Successfully fetched', transformedJobs.length, 'real jobs from FindWork');

        return NextResponse.json({
            success: true,
            data: {
                jobs: transformedJobs.slice(0, parseInt(limit)),
                total: result.count || result.results.length,
                page: parseInt(page),
                totalPages: Math.ceil((result.count || result.results.length) / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('❌ FindWork API error:', error.message);
        
        // Always return fallback jobs on error
        return NextResponse.json({
            success: true,
            data: {
                jobs: getFallbackJobs(query, location),
                total: 6,
                page: parseInt(page),
                totalPages: 1
            },
            fallback: true,
            message: 'API error - showing sample jobs'
        });
    }
}

function makeFindWorkRequest(query, location, page, apiKey) {
    return new Promise((resolve, reject) => {
        // Build query parameters for FindWork API
        const params = new URLSearchParams({
            search: query,
            page: page,
            sort_by: 'relevance'
        });

        if (location) {
            params.append('location', location);
        }

        const path = `/api/jobs/?${params.toString()}`;
        
        const options = {
            method: 'GET',
            hostname: 'findwork.dev',
            port: null,
            path: path,
            headers: {
                'Authorization': `Token ${apiKey}`,
                'User-Agent': 'HireHead-AI/1.0'
            }
        };

        console.log('📡 FindWork API request:', `https://findwork.dev${path}`);

        const req = https.request(options, function (res) {
            const chunks = [];
            
            res.on('data', function (chunk) {
                chunks.push(chunk);
            });

            res.on('end', function () {
                try {
                    const body = Buffer.concat(chunks);
                    const responseText = body.toString();
                    
                    console.log('📡 FindWork API response status:', res.statusCode);
                    
                    if (res.statusCode !== 200) {
                        console.error('❌ FindWork API Error:', res.statusCode, responseText);
                        reject(new Error(`API returned ${res.statusCode}: ${responseText}`));
                        return;
                    }

                    const data = JSON.parse(responseText);
                    console.log('✅ FindWork API response:', {
                        count: data.count,
                        resultsLength: data.results?.length || 0
                    });
                    resolve(data);
                } catch (parseError) {
                    console.error('❌ Parse Error:', parseError);
                    reject(parseError);
                }
            });
        });

        req.on('error', function (error) {
            console.error('❌ Request Error:', error);
            reject(error);
        });

        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

function transformFindWorkData(findWorkJobs) {
    return findWorkJobs.map((job, index) => {
        // Extract salary information
        let salary = 'Salary not specified';
        if (job.salary_min && job.salary_max) {
            salary = `$${formatSalary(job.salary_min)} - $${formatSalary(job.salary_max)}`;
        } else if (job.salary_min) {
            salary = `$${formatSalary(job.salary_min)}+`;
        } else if (job.salary_max) {
            salary = `Up to $${formatSalary(job.salary_max)}`;
        }

        // Extract skills from keywords or description
        const skills = extractSkills(job.text || job.description || '', job.keywords || []);

        // Determine if remote
        const isRemote = job.remote || 
                        job.role?.toLowerCase().includes('remote') ||
                        job.text?.toLowerCase().includes('remote') ||
                        job.location?.toLowerCase().includes('remote') ||
                        false;

        // Extract experience level
        const experience = extractExperience(job.text || job.description || '');

        return {
            id: job.id || `findwork-${index}`,
            title: job.role || job.title || 'Job Title Not Available',
            company: job.company_name || 'Company Not Specified',
            location: job.location || 'Location Not Specified',
            type: job.employment_type || 'Full-time',
            salary: salary,
            skills: skills,
            description: job.text ? 
                job.text.substring(0, 200) + '...' : 
                job.description ? job.description.substring(0, 200) + '...' :
                'No description available',
            postedDate: job.date_posted || new Date().toISOString(),
            matchScore: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
            remote: isRemote,
            experience: experience,
            companyLogo: job.logo || null,
            applyUrl: job.url || job.source_url || '#',
            jobBoard: 'FindWork'
        };
    });
}

function formatSalary(amount) {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'K';
    }
    return amount.toString();
}

function extractSkills(description = '', keywords = []) {
    const commonSkills = [
        'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue.js',
        'TypeScript', 'PHP', 'C++', 'C#', 'Ruby', 'Go', 'Rust', 'Swift',
        'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'MySQL',
        'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins',
        'Git', 'Linux', 'REST', 'GraphQL', 'Redis', 'Elasticsearch'
    ];

    // Combine description and keywords
    const text = (description + ' ' + (Array.isArray(keywords) ? keywords.join(' ') : '')).toLowerCase();
    const foundSkills = commonSkills.filter(skill => 
        text.includes(skill.toLowerCase())
    );

    // Also include keywords if they exist
    if (Array.isArray(keywords) && keywords.length > 0) {
        keywords.forEach(keyword => {
            if (typeof keyword === 'string' && !foundSkills.includes(keyword)) {
                foundSkills.push(keyword);
            }
        });
    }

    return foundSkills.length > 0 ? foundSkills.slice(0, 6) : ['Programming', 'Software Development'];
}

function extractExperience(description = '') {
    const text = description.toLowerCase();
    
    if (text.includes('senior') || text.includes('lead') || text.includes('principal')) {
        return '5+ years';
    } else if (text.includes('mid-level') || text.includes('intermediate')) {
        return '3-5 years';
    } else if (text.includes('junior') || text.includes('entry') || text.includes('graduate')) {
        return '0-2 years';
    } else if (text.match(/\d+\+?\s*years?/)) {
        const match = text.match(/(\d+)\+?\s*years?/);
        return `${match[1]}+ years`;
    }
    
    return '2+ years';
}

function getFallbackJobs(query = '', location = '') {
    const fallbackJobs = [
        {
            id: 'fallback-1',
            title: 'Senior Software Engineer',
            company: 'TechCorp Inc.',
            location: 'San Francisco, CA',
            type: 'Full-time',
            salary: '$120,000 - $160,000',
            skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS'],
            description: 'Join our team to build scalable web applications using modern technologies. We\'re looking for an experienced engineer who can lead projects and mentor junior developers.',
            postedDate: new Date().toISOString(),
            matchScore: 95,
            remote: false,
            experience: '5+ years',
            companyLogo: null,
            applyUrl: 'https://example.com/apply',
            jobBoard: 'Sample'
        },
        {
            id: 'fallback-2',
            title: 'Frontend Developer',
            company: 'StartupXYZ',
            location: 'New York, NY',
            type: 'Full-time',
            salary: '$90,000 - $120,000',
            skills: ['React', 'TypeScript', 'CSS', 'HTML', 'Figma'],
            description: 'Looking for a creative frontend developer to build beautiful user interfaces. You\'ll work closely with our design team to create engaging user experiences.',
            postedDate: new Date().toISOString(),
            matchScore: 88,
            remote: true,
            experience: '3+ years',
            companyLogo: null,
            applyUrl: 'https://example.com/apply',
            jobBoard: 'Sample'
        },
        {
            id: 'fallback-3',
            title: 'Full Stack Developer',
            company: 'Digital Solutions',
            location: 'Remote',
            type: 'Contract',
            salary: '$80,000 - $110,000',
            skills: ['JavaScript', 'Python', 'SQL', 'AWS', 'Docker'],
            description: 'Remote opportunity for experienced developer to work on diverse projects. Flexible schedule and competitive compensation.',
            postedDate: new Date().toISOString(),
            matchScore: 82,
            remote: true,
            experience: '4+ years',
            companyLogo: null,
            applyUrl: 'https://example.com/apply',
            jobBoard: 'Sample'
        },
        {
            id: 'fallback-4',
            title: 'Backend Developer',
            company: 'CloudFirst',
            location: 'Seattle, WA',
            type: 'Full-time',
            salary: '$110,000 - $140,000',
            skills: ['Python', 'Django', 'PostgreSQL', 'Redis', 'AWS'],
            description: 'Design and implement robust backend systems for our cloud platform. Work with cutting-edge technologies.',
            postedDate: new Date().toISOString(),
            matchScore: 75,
            remote: true,
            experience: '4+ years',
            companyLogo: null,
            applyUrl: 'https://example.com/apply',
            jobBoard: 'Sample'
        },
        {
            id: 'fallback-5',
            title: 'DevOps Engineer',
            company: 'ScaleTech',
            location: 'Denver, CO',
            type: 'Full-time',
            salary: '$115,000 - $145,000',
            skills: ['AWS', 'Docker', 'Kubernetes', 'Python', 'Terraform'],
            description: 'Manage cloud infrastructure and deployment pipelines. Help scale our platform to millions of users.',
            postedDate: new Date().toISOString(),
            matchScore: 70,
            remote: false,
            experience: '5+ years',
            companyLogo: null,
            applyUrl: 'https://example.com/apply',
            jobBoard: 'Sample'
        },
        {
            id: 'fallback-6',
            title: 'React Developer',
            company: 'WebFlow Studios',
            location: 'Los Angeles, CA',
            type: 'Full-time',
            salary: '$95,000 - $125,000',
            skills: ['React', 'JavaScript', 'Redux', 'CSS', 'Jest'],
            description: 'Create amazing web applications using React. Join a creative team building the next generation of web experiences.',
            postedDate: new Date().toISOString(),
            matchScore: 85,
            remote: true,
            experience: '3+ years',
            companyLogo: null,
            applyUrl: 'https://example.com/apply',
            jobBoard: 'Sample'
        }
    ];

    // Filter based on query and location if provided
    let filteredJobs = fallbackJobs;

    if (query && query !== 'developer') {
        filteredJobs = filteredJobs.filter(job => 
            job.title.toLowerCase().includes(query.toLowerCase()) ||
            job.skills.some(skill => skill.toLowerCase().includes(query.toLowerCase()))
        );
    }

    if (location) {
        filteredJobs = filteredJobs.filter(job => 
            job.location.toLowerCase().includes(location.toLowerCase()) ||
            job.remote === true
        );
    }

    return filteredJobs;
}