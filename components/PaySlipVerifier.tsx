import React, { useState } from 'react';
import { useLanguage } from './LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';

// Make pdfjsLib available from the window object
declare const pdfjsLib: any;

interface Mismatch {
    field: string;
    govValue: string;
    appValue: string;
}

const PaySlipVerifier: React.FC = () => {
    const { t } = useLanguage();
    const [govSlipFile, setGovSlipFile] = useState<File | null>(null);
    const [appSlipFile, setAppSlipFile] = useState<File | null>(null);
    const [mismatches, setMismatches] = useState<Mismatch[]>([]);
    const [matches, setMatches] = useState<string[]>([]);
    const [isComparing, setIsComparing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'gov' | 'app') => {
        const file = e.target.files?.[0];
        if (file) {
            if (type === 'gov') setGovSlipFile(file);
            else setAppSlipFile(file);
        }
    };

    const extractTextFromPdf = async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(' ');
        }
        return fullText;
    };

    const parsePaySlipText = (text: string): Map<string, string> => {
        const data = new Map<string, string>();
        const textWithNewlines = text.replace(/\s+/g, ' ');

        // Define rules for each field. A rule can have multiple regex patterns to try.
        // Patterns are tried in order. More specific patterns should come first.
        // FIX: The type was for a single object, but the value is an array of objects. Added `[]` to the type.
        const rules: { field: string, patterns: RegExp[] }[] = [
            { field: 'Employee Name', patterns: [/Employee Name\s*\(பணியாளர் பெயர்\s*\)\s*:\s*([^\n]+?)(?=Employee Number|Post)/i, /Employee Name\s*\/.*?:\s*([^\n]+?)(?=Post|Employee Number)/i] },
            { field: 'Employee Number', patterns: [/Employee Number\s*\(பணியாளர் எண்\)\s*:\s*(\d+)/i, /Employee Number\s*\/.*?:\s*(\d+)/i] },
            { field: 'Post', patterns: [/Post\s*\(பதவி\)\s*:\s*([^\n]+?)(?=Office Name|CPS)/i] },
            { field: 'CPS / GPF No.', patterns: [/GPF Number\s*\/\s*CPS Number.*?:\s*(\w+\/?\w*)/i, /CPS\s*\/\s*GPF No\..*?:\s*(\w+\/?\w*)/i] },
            { field: 'PAN Number', patterns: [/PAN Number\s*\/ பான் எண்\s*:\s*(\w+)/i, /PAN Number\s*:\s*(\w+)/i] },
            { field: 'Bank Name', patterns: [/Bank Name\s*:\s*(STATE BANK OF INDIA)/i] },
            { field: 'Account Number', patterns: [/Account Number\s*:\s*(\d+)/i] },
            { field: 'Token Number / Date', patterns: [/Token Number\s*\/\s*Token\s*Date\s*:\s*([\d\s\/]+)(?=Settlement Date)/i, /Token Number\s*\/\s*Token\s*:\s*([\d\s\/]+)(?=Settlement Date)/i] },
            
            // Financials - handle different layouts (e.g., "Label Value" vs "Label: Value")
            { field: 'Duty Pay', patterns: [/Duty Pay\s+([\d,]+)/i] },
            { field: 'Dearness Allowance', patterns: [/Dearness Allowance\s+([\d,]+)/i] },
            { field: 'House Rent Allowance', patterns: [/House Rent Allowance\s+([\d,]+)/i] },
            { field: 'Medical Allowance', patterns: [/Medical Allowance\s+([\d,]+)/i] },
            { field: 'CPS', patterns: [/CPS\s+([\d,]+)/i] },
            { field: 'Family Benefit Fund', patterns: [/Family Benefit Fund\s+([\d,]+)/i] },
            { field: 'Gross Pay', patterns: [/(?:Gross Pay\s*\/\s*மொத்த ஊதியம்|Gross Amount\s*\(மொத்த தொகை\))\s*([\d,]+)/i] },
            { field: 'Total SD', patterns: [/(?:Total SD\s*\/\s*மொத்த கட்டாய பிடித்தம்|Total SD\s*\(மொத்த கட்டாய பிடித்தம்\))\s*([\d,]+)/i] },
            { field: 'Net Pay Credited', patterns: [/(?:Net Pay Credited\s*\(1-2-3\)|NetPay Credited.*?\(நிகர.*?)\s*([\d,]+)/i] },
        ];
    
        for (const rule of rules) {
            for (const pattern of rule.patterns) {
                const match = textWithNewlines.match(pattern);
                if (match && match[1]) {
                    const value = match[1].replace(/,/g, '').trim();
                    data.set(rule.field, value);
                    break; // Move to the next field once a match is found
                }
            }
        }
        
        return data;
    };

     const generateFixSuggestions = (mismatches: Mismatch[], matches: string[]) => {
        const newSuggestions: string[] = [];
        mismatches.forEach(m => {
            if (m.appValue === 'Not Found') {
                newSuggestions.push(`Field "${m.field}" is missing from the generated slip. Consider adding this field and its value to the PaySlipResult.tsx component.`);
            } else if (m.govValue === 'Not Found') {
                newSuggestions.push(`Field "${m.field}" exists in the generated slip but not in the official one. Verify if this field should be included.`);
            } else if (/\d/.test(m.govValue) && /\d/.test(m.appValue) && m.govValue !== m.appValue) {
                newSuggestions.push(`Numeric value for "${m.field}" is different. Official: ${m.govValue}, Generated: ${m.appValue}. Please check the calculation logic in payrollService.ts.`);
            } else {
                 newSuggestions.push(`Text value for "${m.field}" is different. Official: "${m.govValue}", Generated: "${m.appValue}". Check for typos, formatting, or translation differences in PaySlipResult.tsx or translations.ts.`);
            }
        });

        if(newSuggestions.length === 0 && matches.length > 0) {
            newSuggestions.push("No critical mismatches found! The generated pay slip appears to be compliant with the official format based on the checked fields.");
        }
        setSuggestions(newSuggestions);
    };


    const handleCompare = async () => {
        if (!govSlipFile || !appSlipFile) {
            setError("Please upload both files.");
            return;
        }
        setIsComparing(true);
        setError(null);
        setMismatches([]);
        setMatches([]);
        setSuggestions([]);

        try {
            const govText = await extractTextFromPdf(govSlipFile);
            const appText = await extractTextFromPdf(appSlipFile);

            const govData = parsePaySlipText(govText);
            const appData = parsePaySlipText(appText);

            const allKeys = new Set([...govData.keys(), ...appData.keys()]);
            const newMismatches: Mismatch[] = [];
            const newMatches: string[] = [];

            allKeys.forEach(key => {
                const govValue = govData.get(key) || 'Not Found';
                const appValue = appData.get(key) || 'Not Found';

                if (govValue.trim().toLowerCase() !== appValue.trim().toLowerCase()) {
                    newMismatches.push({ field: key, govValue, appValue });
                } else {
                    newMatches.push(key);
                }
            });

            setMismatches(newMismatches);
            setMatches(newMatches);
            generateFixSuggestions(newMismatches, newMatches);

        } catch (e) {
            console.error(e);
            setError("Failed to parse PDF files. They might be corrupted or in an unsupported format.");
        } finally {
            setIsComparing(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('paySlipFormatVerifier')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border">
                    <div>
                        <Label htmlFor="gov-slip" className="font-semibold">{t('uploadGovtSlip')}</Label>
                        <Input id="gov-slip" type="file" accept="application/pdf" onChange={(e) => handleFileChange(e, 'gov')} className="mt-2" />
                    </div>
                    <div>
                        <Label htmlFor="app-slip" className="font-semibold">{t('uploadAppSlip')}</Label>
                        <Input id="app-slip" type="file" accept="application/pdf" onChange={(e) => handleFileChange(e, 'app')} className="mt-2" />
                    </div>
                </div>

                <Button onClick={handleCompare} disabled={isComparing || !govSlipFile || !appSlipFile} className="w-full">
                    {isComparing ? t('calculating') : t('compareNow')}
                </Button>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                
                {(mismatches.length > 0 || matches.length > 0 || suggestions.length > 0) && (
                    <div className="space-y-6 pt-6 border-t">
                         {suggestions.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-lg text-blue-600 mb-2">{t('autoFixSuggestions')}</h3>
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-800">
                                        {suggestions.map((s, i) => <li key={i} dangerouslySetInnerHTML={{ __html: s.replace(/"(.*?)"/g, '"<strong>$1</strong>"') }}></li>)}
                                    </ul>
                                </div>
                            </div>
                        )}
                        <div>
                            <h3 className="font-semibold text-lg text-red-600 mb-2">{t('mismatched')} ({mismatches.length})</h3>
                            {mismatches.length === 0 ? <p className="text-sm text-gray-500">No mismatches found.</p> : (
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-gray-600">Field</th>
                                                <th className="px-4 py-2 text-left font-medium text-gray-600">Official Value</th>
                                                <th className="px-4 py-2 text-left font-medium text-gray-600">Generated Value</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {mismatches.map((m, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 font-medium">{m.field}</td>
                                                    <td className="px-4 py-2 font-mono bg-red-50 text-red-800">{m.govValue}</td>
                                                    <td className="px-4 py-2 font-mono bg-yellow-50 text-yellow-800">{m.appValue}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg text-green-600 mb-2">{t('matched')} ({matches.length})</h3>
                             {matches.length > 0 ? (
                                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <ul className="list-disc list-inside text-sm text-gray-700 columns-2 sm:columns-3 md:columns-4 gap-x-4">
                                        {matches.map(m => <li key={m}>{m}</li>)}
                                    </ul>
                                </div>
                             ) : <p className="text-sm text-gray-500">No matching fields found.</p>}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default PaySlipVerifier;