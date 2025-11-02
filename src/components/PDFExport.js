"use client";
import { useState } from 'react';
import { Download, X, FileText, Layout, Minimize } from 'lucide-react';

const PDFExport = ({ profileData, onClose }) => {
    const [selectedLayout, setSelectedLayout] = useState('modern');
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState(null);

    // Modern Layout Generator (ATS-Friendly: Single-column, clean sans-serif, bold headings, no colors/backgrounds)
    const generateModernLayout = (doc, data, pageWidth, pageHeight) => {
        const margin = 40;
        let yPos = 50;
        
        // Name in large, bold font, left-aligned
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(data.displayName || 'Profile', margin, yPos);
        yPos += 20;
        
        // Contact info in simple lines, left-aligned
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (data.email) {
            doc.text(`Email: ${data.email}`, margin, yPos);
            yPos += 8;
        }
        if (data.phone) {
            doc.text(`Phone: ${data.phone}`, margin, yPos);
            yPos += 8;
        }
        if (data.location) {
            doc.text(`Location: ${data.location}`, margin, yPos);
            yPos += 12;
        }
        
        // Professional Summary with bold header
        if (data.profileSummary) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('PROFESSIONAL SUMMARY', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(data.profileSummary, pageWidth - 2 * margin);
            doc.text(lines, margin, yPos);
            yPos += lines.length * 6 + 12;
        }
        
        // Skills with standard bullets
        if (data.skills && data.skills.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('SKILLS', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            data.skills.forEach(skill => {
                doc.text(`• ${skill}`, margin + 5, yPos);
                yPos += 7;
            });
            yPos += 8;
        }
        
        // Education with structured entries
        if (data.education && data.education.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('EDUCATION', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            data.education.forEach(edu => {
                if (edu.degree || edu.institution) {
                    doc.setFont('helvetica', 'bold');
                    doc.text(edu.degree || 'Degree', margin, yPos);
                    yPos += 7;
                    doc.setFont('helvetica', 'normal');
                    if (edu.institution) {
                        doc.text(edu.institution, margin, yPos);
                        yPos += 7;
                    }
                    if (edu.year) {
                        doc.text(edu.year, margin, yPos);
                        yPos += 7;
                    }
                    yPos += 5;
                }
            });
            yPos += 8;
        }
        
        // Certifications if available
        if (data.certifications && data.certifications.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('CERTIFICATIONS', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            data.certifications.forEach(cert => {
                if (cert.name) {
                    doc.text(`• ${cert.name} - ${cert.issuer || 'N/A'}`, margin + 5, yPos);
                    yPos += 7;
                }
            });
        }
        
        // Simple footer
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 20);
    };
    
    // Classic Layout Generator (ATS-Friendly: Single-column for better parsing, serif font, standard headings, no decorative elements)
    const generateClassicLayout = (doc, data, pageWidth, pageHeight) => {
        const margin = 40;
        let yPos = 50;
        
        // Name centered but simple, bold
        doc.setFontSize(22);
        doc.setFont('times', 'bold');
        doc.text(data.displayName || 'Profile', pageWidth / 2, yPos, { align: 'center' });
        yPos += 20;
        
        // Contact info centered, simple lines
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        const contacts = [data.email, data.phone, data.location].filter(Boolean);
        contacts.forEach(contact => {
            doc.text(contact, pageWidth / 2, yPos, { align: 'center' });
            yPos += 8;
        });
        yPos += 12;
        
        // Single column for ATS compatibility (removed two-column)
        // Professional Summary
        if (data.profileSummary) {
            doc.setFontSize(14);
            doc.setFont('times', 'bold');
            doc.text('PROFESSIONAL SUMMARY', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont('times', 'normal');
            const lines = doc.splitTextToSize(data.profileSummary, pageWidth - 2 * margin);
            doc.text(lines, margin, yPos);
            yPos += lines.length * 6 + 12;
        }
        
        // Skills
        if (data.skills && data.skills.length > 0) {
            doc.setFontSize(14);
            doc.setFont('times', 'bold');
            doc.text('SKILLS', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont('times', 'normal');
            data.skills.forEach(skill => {
                doc.text(`• ${skill}`, margin + 5, yPos);
                yPos += 7;
            });
            yPos += 8;
        }
        
        // Education
        if (data.education && data.education.length > 0) {
            doc.setFontSize(14);
            doc.setFont('times', 'bold');
            doc.text('EDUCATION', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            data.education.forEach(edu => {
                if (edu.degree || edu.institution) {
                    doc.setFont('times', 'bold');
                    doc.text(edu.degree || 'Degree', margin, yPos);
                    yPos += 7;
                    doc.setFont('times', 'italic');
                    if (edu.institution) {
                        doc.text(edu.institution, margin, yPos);
                        yPos += 7;
                    }
                    doc.setFont('times', 'normal');
                    if (edu.year) {
                        doc.text(edu.year, margin, yPos);
                        yPos += 7;
                    }
                    yPos += 5;
                }
            });
            yPos += 8;
        }
        
        // Certifications if available
        if (data.certifications && data.certifications.length > 0) {
            doc.setFontSize(14);
            doc.setFont('times', 'bold');
            doc.text('CERTIFICATIONS', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont('times', 'normal');
            data.certifications.forEach(cert => {
                if (cert.name) {
                    doc.text(`• ${cert.name} - ${cert.issuer || 'N/A'}`, margin + 5, yPos);
                    yPos += 7;
                }
            });
        }
        
        // Simple footer
        doc.setFontSize(9);
        doc.setFont('times', 'italic');
        doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
    };
    
    // Minimal Layout Generator (ATS-Friendly: Ultra-simple single-column, sans-serif, no brackets or special chars, standard bullets)
    const generateMinimalLayout = (doc, data, pageWidth, pageHeight) => {
        const margin = 40;
        let yPos = 50;
        
        // Simple bold name, left-aligned
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(data.displayName || 'PROFILE', margin, yPos);
        yPos += 15;
        
        // Compact contact info, left-aligned
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const contacts = [
            data.email && `Email: ${data.email}`,
            data.phone && `Phone: ${data.phone}`,
            data.location && `Location: ${data.location}`
        ].filter(Boolean);
        contacts.forEach(contact => {
            doc.text(contact, margin, yPos);
            yPos += 8;
        });
        yPos += 10;
        
        // Simple sections with bold headers
        // Summary
        if (data.profileSummary) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('PROFESSIONAL SUMMARY', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(data.profileSummary, pageWidth - 2 * margin);
            doc.text(lines, margin, yPos);
            yPos += lines.length * 6 + 10;
        }
        
        // Skills in simple list
        if (data.skills && data.skills.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('SKILLS', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            data.skills.forEach(skill => {
                doc.text(`• ${skill}`, margin + 5, yPos);
                yPos += 7;
            });
            yPos += 8;
        }
        
        // Education
        if (data.education && data.education.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('EDUCATION', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            data.education.forEach(edu => {
                if (edu.degree || edu.institution) {
                    const eduLine = `${edu.degree || 'N/A'}, ${edu.institution || 'N/A'} - ${edu.year || 'N/A'}`;
                    doc.text(`• ${eduLine}`, margin + 5, yPos);
                    yPos += 7;
                }
            });
            yPos += 8;
        }
        
        // Certifications
        if (data.certifications && data.certifications.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('CERTIFICATIONS', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            data.certifications.forEach(cert => {
                if (cert.name) {
                    const certLine = `${cert.name} - ${cert.issuer || 'N/A'}`;
                    doc.text(`• ${certLine}`, margin + 5, yPos);
                    yPos += 7;
                }
            });
        }
        
        // Simple footer
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 20);
    };

    const layouts = [
        {
            id: 'modern',
            name: 'Modern',
            description: 'Single-column layout with Helvetica sans-serif font, bold section headers for clear ATS parsing',
            icon: Layout,
            preview: 'Left-aligned name and contacts, standard bold headings, bullet-point lists'
        },
        {
            id: 'classic',
            name: 'Classic',
            description: 'Single-column layout with Times Roman serif font, traditional formal styling optimized for ATS',
            icon: FileText,
            preview: 'Centered name, left-aligned sections, italic institution names, simple bullets'
        },
        {
            id: 'minimal',
            name: 'Minimal',
            description: 'Compact single-column layout with Helvetica font, ultra-simple for maximum ATS compatibility',
            icon: Minimize,
            preview: 'Basic bold headings, left-aligned text, standard bullet points, no extras'
        }
    ];

    const exportToPDF = async (layout) => {
        setIsExporting(true);
        
        try {
            // Check if we have profile data
            if (!profileData) {
                throw new Error('No profile data available');
            }

            // Dynamic import of jsPDF
            let jsPDF;
            try {
                const jsPDFModule = await import('jspdf');
                jsPDF = jsPDFModule.default;
            } catch (importError) {
                console.error('Failed to import jsPDF:', importError);
                throw new Error('Failed to load PDF library');
            }

            // Create new PDF document
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            
            // Layout-specific generation
            if (layout === 'modern') {
                generateModernLayout(doc, profileData, pageWidth, pageHeight);
            } else if (layout === 'classic') {
                generateClassicLayout(doc, profileData, pageWidth, pageHeight);
            } else if (layout === 'minimal') {
                generateMinimalLayout(doc, profileData, pageWidth, pageHeight);
            }
            
            // Generate filename
            const timestamp = new Date().toISOString().slice(0, 10);
            const safeName = (profileData.displayName || 'profile').replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${safeName}_${layout}_${timestamp}.pdf`;
            
            // Save the PDF
            doc.save(fileName);
            
            // Success message
            console.log('PDF generated successfully:', fileName);
            
        } catch (error) {
            console.error('PDF Export Error:', error);
            
            // Show user-friendly error message
            const errorMessage = error.message || 'Unknown error occurred';
            alert(`Failed to export PDF: ${errorMessage}\n\nPlease try again or contact support if the problem persists.`);
            
        } finally {
            setIsExporting(false);
            onClose();
        }
    };

    const handleLayoutSelect = (layoutId) => {
        console.log('Layout selected:', layoutId);
        setSelectedLayout(layoutId);
        exportToPDF(layoutId);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <Download className="text-green-600" size={24} />
                            <h2 className="text-xl font-semibold text-gray-800">Export Profile to PDF</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 mb-6">
                        Choose a layout style for your PDF export. All layouts are now ATS-friendly: single-column, standard fonts, clear headings, and no decorative elements.
                    </p>

                    {/* Layout Options */}
                    <div className="space-y-6">
                        {layouts.map((layout) => {
                            const IconComponent = layout.icon;
                            return (
                                <div
                                    key={layout.id}
                                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                        selectedLayout === layout.id
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => setSelectedLayout(layout.id)}
                                >
                                    <div className="flex items-start space-x-4">
                                        {/* Preview Box */}
                                        <div className="flex-shrink-0">
                                            <div className="w-24 h-32 bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
                                                {layout.id === 'modern' && (
                                                    <div className="p-2 text-xs">
                                                        {/* Modern Preview - ATS Friendly */}
                                                        <div className="font-bold text-black">JOHN DOE</div>
                                                        <div className="text-gray-600 mb-2 text-[6px]">
                                                            Email: john@email.com<br/>
                                                            Phone: (555) 123-4567
                                                        </div>
                                                        <div className="font-bold text-[7px] mb-1">PROFESSIONAL SUMMARY</div>
                                                        <div className="text-[5px] text-gray-600 mb-2">
                                                            Professional with experience...
                                                        </div>
                                                        <div className="font-bold text-[7px] mb-1">SKILLS</div>
                                                        <div className="text-[5px] text-gray-600">
                                                            • JavaScript<br/>• React<br/>• Node.js
                                                        </div>
                                                    </div>
                                                )}
                                                {layout.id === 'classic' && (
                                                    <div className="p-2 text-xs">
                                                        {/* Classic Preview - ATS Friendly */}
                                                        <div className="text-center mb-2">
                                                            <div className="font-bold text-black text-[8px]">JOHN DOE</div>
                                                            <div className="text-[5px] text-gray-600">
                                                                john@email.com<br/>
                                                                (555) 123-4567
                                                            </div>
                                                        </div>
                                                        <div className="font-bold text-[7px] mb-1">PROFESSIONAL SUMMARY</div>
                                                        <div className="text-[5px] text-gray-600 mb-2">Professional with...</div>
                                                        <div className="font-bold text-[7px] mb-1">EDUCATION</div>
                                                        <div className="text-[5px] text-gray-600 italic mb-1">Bachelor's Degree</div>
                                                        <div className="text-[5px] text-gray-600">University of Example, 2020</div>
                                                    </div>
                                                )}
                                                {layout.id === 'minimal' && (
                                                    <div className="p-2 text-xs">
                                                        {/* Minimal Preview - ATS Friendly */}
                                                        <div className="font-bold text-[8px] mb-1">JOHN DOE</div>
                                                        <div className="text-[5px] text-gray-600 mb-2">
                                                            Email: john@email.com<br/>Phone: (555) 123-4567
                                                        </div>
                                                        <div className="font-bold text-[6px] mb-1">PROFESSIONAL SUMMARY</div>
                                                        <div className="text-[5px] text-gray-600 mb-2 ml-1">
                                                            Professional developer...
                                                        </div>
                                                        <div className="font-bold text-[6px] mb-1">SKILLS</div>
                                                        <div className="text-[5px] text-gray-600 ml-1">
                                                            • JavaScript • React<br/>• Node.js • Python
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Layout Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <IconComponent 
                                                    size={20} 
                                                    className={selectedLayout === layout.id ? 'text-green-600' : 'text-gray-600'} 
                                                />
                                                <h3 className="font-semibold text-gray-800">{layout.name}</h3>
                                            </div>
                                            <p className="text-gray-600 text-sm mb-2">{layout.description}</p>
                                            <p className="text-gray-500 text-xs">{layout.preview}</p>
                                            
                                            {/* Layout Features */}
                                            <div className="mt-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {layout.id === 'modern' && (
                                                        <>
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Helvetica</span>
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Single Column</span>
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">ATS Optimized</span>
                                                        </>
                                                    )}
                                                    {layout.id === 'classic' && (
                                                        <>
                                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Times Roman</span>
                                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Single Column</span>
                                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">ATS Optimized</span>
                                                        </>
                                                    )}
                                                    {layout.id === 'minimal' && (
                                                        <>
                                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Helvetica</span>
                                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Single Column</span>
                                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">ATS Optimized</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Selection Radio */}
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                            selectedLayout === layout.id
                                                ? 'border-green-500 bg-green-500'
                                                : 'border-gray-300'
                                        }`}>
                                            {selectedLayout === layout.id && (
                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleLayoutSelect(selectedLayout)}
                            disabled={isExporting}
                            className="px-6 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            {isExporting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    <span>Export PDF</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PDFExport;