"use client";
import { useParams, useRouter } from "next/navigation";
import { 
    Code, Database, Smartphone, Shield, Cloud, 
    Palette, BarChart3, Cpu, Globe, ArrowRight, Star,
    TrendingUp, Users, Zap
} from "lucide-react";

export default function RoadmapPage() {
    const params = useParams();
    const router = useRouter();

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

    const skillCategories = [
        {
            category: "DEVELOPMENT",
            skills: [
                {
                    id: "frontend",
                    name: "Frontend Development",
                    description: "Build user interfaces with HTML, CSS, JavaScript, and modern frameworks",
                    icon: Code,
                    difficulty: "Beginner",
                    duration: "4-6 months",
                    popularity: 95,
                    color: "blue"
                },
                {
                    id: "backend",
                    name: "Backend Development", 
                    description: "Server-side programming, APIs, and database management",
                    icon: Database,
                    difficulty: "Intermediate",
                    duration: "6-8 months",
                    popularity: 88,
                    color: "blue"
                },
                {
                    id: "fullstack",
                    name: "Full Stack Development",
                    description: "Complete web development from frontend to backend",
                    icon: Globe,
                    difficulty: "Intermediate",
                    duration: "8-12 months",
                    popularity: 92,
                    color: "blue"
                },
                {
                    id: "ios",
                    name: "iOS Development",
                    description: "Build native iOS apps using Swift, SwiftUI, and Xcode development tools",
                    icon: Smartphone,
                    difficulty: "Intermediate",
                    duration: "6-8 months",
                    popularity: 82,
                    color: "blue"
                },
                {
                    id: "android",
                    name: "Android Development",
                    description: "Create Android apps with Kotlin, Java, and Android Studio",
                    icon: Smartphone,
                    difficulty: "Intermediate",
                    duration: "6-8 months",
                    popularity: 88,
                    color: "blue"
                }
            ]
        },
        {
            category: "DATA & AI",
            skills: [
                {
                    id: "ai-and-data-science",
                    name: "AI and Data Science",
                    description: "Analyze data, build models, and extract insights using Python/R",
                    icon: BarChart3,
                    difficulty: "Advanced",
                    duration: "10-15 months",
                    popularity: 90,
                    color: "blue"
                },
                {
                    id: "machine-learning",
                    name: "Machine Learning",
                    description: "Build intelligent systems and predictive models",
                    icon: BarChart3,
                    difficulty: "Advanced",
                    duration: "12-18 months",
                    popularity: 87,
                    color: "blue"
                },
                {
                    id: "ai-engineering",
                    name: "AI Engineering",
                    description: "Deploy and scale AI/ML systems in production",
                    icon: Cpu,
                    difficulty: "Expert",
                    duration: "15-20 months",
                    popularity: 82,
                    color: "blue"
                }
            ]
        },
        {
            category: "INFRASTRUCTURE & SECURITY",
            skills: [
                {
                    id: "devops",
                    name: "DevOps Engineering",
                    description: "Automate deployment, monitoring, and infrastructure management",
                    icon: Cloud,
                    difficulty: "Intermediate",
                    duration: "6-10 months",
                    popularity: 86,
                    color: "blue"
                },
                {
                    id: "cybersecurity",
                    name: "Cybersecurity",
                    description: "Protect systems and data from security threats",
                    icon: Shield,
                    difficulty: "Advanced",
                    duration: "8-12 months",
                    popularity: 84,
                    color: "blue"
                }
            ]
        },
        {
            category: "DESIGN AND BUISNESS ",
            skills: [
                {
                    id: "ui-ux",
                    name: "UI/UX Design",
                    description: "Design user-friendly interfaces and experiences",
                    icon: Palette,
                    difficulty: "Beginner",
                    duration: "4-8 months",
                    popularity: 89,
                    color: "blue"
                },
                {
                    id: "product-management",
                    name: "Product Management",
                    description: "Lead product strategy, development, and launch",
                    icon: Users,
                    difficulty: "Intermediate",
                    duration: "6-10 months",
                    popularity: 83,
                    color: "blue"
                }
            ]
        }
    ];

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Beginner': return 'bg-green-100 text-green-800';
            case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
            case 'Advanced': return 'bg-orange-100 text-orange-800';
            case 'Expert': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getColorClasses = (color) => {
        const colors = {
            blue: 'bg-blue-50 border-blue-200 hover:border-blue-300',
            green: 'bg-green-50 border-green-200 hover:border-green-300',
            purple: 'bg-purple-50 border-purple-200 hover:border-purple-300',
            indigo: 'bg-indigo-50 border-indigo-200 hover:border-indigo-300',
            orange: 'bg-orange-50 border-orange-200 hover:border-orange-300',
            red: 'bg-red-50 border-red-200 hover:border-red-300',
            pink: 'bg-pink-50 border-pink-200 hover:border-pink-300',
            cyan: 'bg-cyan-50 border-cyan-200 hover:border-cyan-300',
            gray: 'bg-gray-50 border-gray-200 hover:border-gray-300',
            yellow: 'bg-yellow-50 border-yellow-200 hover:border-yellow-300',
            emerald: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
        };
        return colors[color] || colors.blue;
    };

    const getIconColor = (color) => {
        const colors = {
            blue: 'text-blue-300',
            green: 'text-green-300',
            purple: 'text-purple-300',
            indigo: 'text-indigo-300',
            orange: 'text-orange-300',
            red: 'text-red-300',
            pink: 'text-pink-300',
            cyan: 'text-cyan-300',
            gray: 'text-gray-300',
            yellow: 'text-yellow-300',
            emerald: 'text-emerald-300'
        };
        return colors[color] || colors.blue;
    };

    const handleSkillSelect = (skillId) => {
        // Map skill IDs to roadmap.sh URLs
        const roadmapUrls = {
            'frontend': 'https://roadmap.sh/frontend',
            'backend': 'https://roadmap.sh/backend',
            'fullstack': 'https://roadmap.sh/full-stack',
            'ios': 'https://roadmap.sh/ios',
            'android': 'https://roadmap.sh/android',
            'ai-and-data-science': 'https://roadmap.sh/ai-data-scientist',
            'machine-learning': 'https://roadmap.sh/machine-learning',
            'ai-engineering': 'https://roadmap.sh/ai-engineer',
            'devops': 'https://roadmap.sh/devops',
            'cybersecurity': 'https://roadmap.sh/cyber-security',
            'ui-ux': 'https://roadmap.sh/ux-design',
            'product-management': 'https://roadmap.sh/product-manager',
        };

        const roadmapUrl = roadmapUrls[skillId];
        if (roadmapUrl) {
            // Open roadmap.sh in a new tab
            window.open(roadmapUrl, '_blank');
        } else {
            console.warn(`No roadmap URL found for skill: ${skillId}`);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Modern Header */}
            <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-300 rounded-xl flex items-center justify-center shadow-lg">
                            <Code className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                Learning Roadmaps for {getDisplayName()}
                            </h1>
                            <p className=" text-gray-600">Choose your learning path and follow structured roadmaps to advance your career</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {skillCategories.map((category) => (
                    <div key={category.category} className="mb-12">
                        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex justify-center items-center">
                            
                            {category.category}
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {category.skills.map((skill) => {
                                const IconComponent = skill.icon;
                                return (
                                    <div
                                        key={skill.id}
                                        onClick={() => handleSkillSelect(skill.id)}
                                        className={`${getColorClasses(skill.color)} border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 relative`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <IconComponent className={`${getIconColor(skill.color)}`} size={32} />
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(skill.difficulty)}`}>
                                                {skill.difficulty}
                                            </span>
                                        </div>
                                        
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                            {skill.name}
                                        </h3>
                                        
                                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                            {skill.description}
                                        </p>
                                        
                                        <div className="space-y-2 mb-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Duration:</span>
                                                <span className="font-medium text-gray-700">{skill.duration}</span>
                                            </div>
                                            
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Popularity:</span>
                                                <div className="flex items-center space-x-1">
                                                    <Star className="text-yellow-400" size={14} />
                                                    <span className="font-medium text-gray-700">{skill.popularity}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Arrow positioned at bottom right corner */}
                                        <div className="absolute bottom-4 right-4">
                                            <ArrowRight className={`${getIconColor(skill.color)} flex-shrink-0`} size={20} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Call to Action */}
                <div className="bg-blue-400 rounded-2xl p-8 text-center text-white mt-16">
                    <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
                    <p className="text-xl mb-6 opacity-90">
                        Choose any skill above to access the official roadmap.sh learning paths with comprehensive guidance.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <div className="bg-white/20 rounded-lg px-4 py-2">
                            <span className="font-semibold">🔗 Official roadmap.sh</span>
                        </div>
                        <div className="bg-white/20 rounded-lg px-4 py-2">
                            <span className="font-semibold">🎯 Interactive Roadmaps</span>
                        </div>
                        <div className="bg-white/20 rounded-lg px-4 py-2">
                            <span className="font-semibold">📈 Community Driven</span>
                        </div>
                        <div className="bg-white/20 rounded-lg px-4 py-2">
                            <span className="font-semibold">🆓 Free Resources</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}