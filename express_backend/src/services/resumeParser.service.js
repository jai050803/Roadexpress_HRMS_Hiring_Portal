class ResumeParserService {
  constructor() {
    this.knownSkills = [
      'javascript', 'typescript', 'node.js', 'nodejs', 'express', 'react', 'next.js',
      'python', 'django', 'fastapi', 'flask', 'sql', 'postgresql', 'postgres',
      'mongodb', 'redis', 'docker', 'kubernetes', 'aws', 'git', 'ci/cd', 'rest api',
      'linehaul', 'fleet management', 'supply chain', 'logistics', 'dispatch',
      'route optimization', 'warehouse management', 'freight operations',
      'inventory control', 'vendor management', 'transportation management',
      'sla monitoring', 'operations management', 'hub operations', 'first mile',
      'last mile', 'middle mile', 'gps tracking', 'excel', 'mis reporting'
    ];
  }

  async extractRawText(buffer) {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (err) {
      const asciiText = buffer.toString('ascii');
      const textMatches = asciiText.match(/[\w\s.,@+/:()-]{4,}/g);
      if (textMatches && textMatches.length > 0) {
        return textMatches.join(' ');
      }
      return '';
    }
  }

  extractEmail(text) {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
    const match = text.match(emailRegex);
    return match ? match[1].toLowerCase().trim() : null;
  }

  extractPhone(text) {
    const phoneRegex = /(?:(?:\+91|0)?[ -]?)?([6-9]\d{4}[ -]?\d{5}|[6-9]\d{9})/g;
    const match = text.match(phoneRegex);
    if (match) {
      return match[0].replace(/[\s-]/g, '').trim();
    }
    const genericPhone = /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/;
    const fallbackMatch = text.match(genericPhone);
    return fallbackMatch ? fallbackMatch[0].trim() : null;
  }

  extractSkills(text) {
    const lowerText = text.toLowerCase();
    const matchedSkills = [];

    for (const skill of this.knownSkills) {
      const regex = new RegExp(`(?:\\b|\\W)${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\b|\\W)`, 'i');
      if (regex.test(lowerText)) {
        matchedSkills.push(skill);
      }
    }

    return Array.from(new Set(matchedSkills));
  }

  extractExperienceYears(text) {
    const expRegex = /(\d{1,2}(?:\.\d)?)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/i;
    const match = text.match(expRegex);
    if (match) {
      return parseFloat(match[1]);
    }
    return 0;
  }

  extractEducation(text) {
    const educationTerms = [
      'B.Tech', 'B.E.', 'M.Tech', 'MBA', 'MCA', 'B.Sc', 'M.Sc', 'BBA', 'B.Com',
      'Bachelor of Technology', 'Bachelor of Engineering', 'Master of Business Administration',
      'Diploma in Logistics', 'Supply Chain Management'
    ];

    const found = [];
    const lowerText = text.toLowerCase();

    for (const edu of educationTerms) {
      if (lowerText.includes(edu.toLowerCase())) {
        found.push(edu);
      }
    }

    return Array.from(new Set(found));
  }

  async parseResume(buffer) {
    const rawText = await this.extractRawText(buffer);
    const email = this.extractEmail(rawText);
    const phone = this.extractPhone(rawText);
    const skills = this.extractSkills(rawText);
    const experienceYears = this.extractExperienceYears(rawText);
    const education = this.extractEducation(rawText);

    return {
      rawText,
      parsedJson: {
        email,
        phone,
        skills,
        total_experience_years: experienceYears,
        education,
        certifications: []
      }
    };
  }
}

module.exports = ResumeParserService;
