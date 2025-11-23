import { StoolEntry, AlertType } from '@prisma/client';

// Interface for Analysis Result
export interface AnalysisResult {
  score: number; // 0-100
  riskLevel: 'Low' | 'Medium' | 'High';
  findings: string[];
  references: Reference[];
  alerts: AlertType[];
}

export interface Reference {
  title: string;
  authors: string;
  journal: string;
  year: number;
  relevance: string;
}

export class AnalysisEngine {
  
  /**
   * Main analysis entry point
   * Combines Rule-based Expert System (Rome IV) and Statistical Analysis (ML-lite)
   */
  static analyze(entries: StoolEntry[]): AnalysisResult {
    if (!entries || entries.length === 0) {
      return {
        score: 100,
        riskLevel: 'Low',
        findings: ['No data available for analysis.'],
        references: [],
        alerts: []
      };
    }

    // Sort entries by date descending just in case
    const sortedEntries = [...entries].sort((a, b) => b.timestampMinute.getTime() - a.timestampMinute.getTime());

    const findings: string[] = [];
    const alerts: AlertType[] = [];
    const references: Reference[] = [];

    // 1. Rule-Based Expert System: Rome IV Criteria for IBS
    // Paper: "Rome IV Criteria for Functional Gastrointestinal Disorders" (2016)
    const ibsRisk = this.checkRomeIV(sortedEntries);
    if (ibsRisk) {
      findings.push('Potential IBS symptoms detected (Rome IV Criteria).');
      references.push({
        title: 'Rome IV Criteria for Functional Gastrointestinal Disorders',
        authors: 'Drossman DA et al.',
        journal: 'Gastroenterology',
        year: 2016,
        relevance: 'Standard diagnostic criteria for IBS.'
      });
      alerts.push(AlertType.custom); 
    }

    // 2. Statistical Analysis (Machine Learning Strategy: Anomaly Detection)
    // Paper: "Bristol Stool Form Scale as a determinant of colonic transit time" (Lewis & Heaton, 1997)
    const anomalyResult = this.detectBristolAnomalies(sortedEntries);
    if (anomalyResult.isAnomalous) {
      findings.push(`Irregular stool consistency detected (Variance: ${anomalyResult.variance.toFixed(2)}).`);
      references.push({
        title: 'Stool form scale as a useful guide to intestinal transit time',
        authors: 'Lewis SJ, Heaton KW',
        journal: 'Scand J Gastroenterol',
        year: 1997,
        relevance: 'Correlates stool form with transit time.'
      });
    }

    // 3. Red Flag Analysis (Expert System)
    const redFlags = this.checkRedFlags(sortedEntries);
    if (redFlags.length > 0) {
      findings.push(...redFlags);
      alerts.push(AlertType.custom);
    }

    // 4. Calculate Health Score
    const score = this.calculateHealthScore(sortedEntries, findings.length);

    return {
      score,
      riskLevel: score < 60 ? 'High' : score < 80 ? 'Medium' : 'Low',
      findings,
      references,
      alerts: Array.from(new Set(alerts))
    };
  }

  /**
   * Implementation of Rome IV Criteria logic for IBS
   * Simplified for available data:
   * - Recurrent symptoms > 1 day/week in last 3 months (approx 12 weeks)
   * - Association with change in form or frequency
   */
  private static checkRomeIV(entries: StoolEntry[]): boolean {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
    
    const recentEntries = entries.filter(e => e.timestampMinute >= threeMonthsAgo);
    if (recentEntries.length < 10) return false; // Not enough data

    // Count weeks with "symptoms" (abdominal pain implied if symptoms array not empty? 
    // We'll assume 'pain' or 'discomfort' keyword in symptoms for strict check, 
    // or just presence of reported symptoms for now as a proxy).
    // In a real expert system, we would look for specific SNOMED CT codes.
    
    // Let's assume if 'symptoms' array has specific keywords
    const painKeywords = ['pain', 'cramp', 'ache', 'discomfort', 'bloating', 'stomach ache', 'abdominal'];
    
    let weeksWithSymptoms = 0;
    const distinctWeeks = new Set<string>();

    for (const entry of recentEntries) {
      const hasPain = entry.symptoms.some(s => painKeywords.some(k => s.toLowerCase().includes(k)));
      if (hasPain) {
        const weekId = `${entry.timestampMinute.getFullYear()}-W${Math.floor(entry.timestampMinute.getDate() / 7)}`;
        distinctWeeks.add(weekId);
      }
    }
    weeksWithSymptoms = distinctWeeks.size;

    // Criterion: Average at least 1 day/week in last 3 months => roughly 12 weeks. 
    // Let's be lenient: if detected in > 3 distinct weeks.
    if (weeksWithSymptoms < 3) return false;

    // Check association with stool form change (Type 1-2 or 6-7)
    const abnormalStools = recentEntries.filter(e => e.bristolType <= 2 || e.bristolType >= 6).length;
    const ratio = abnormalStools / recentEntries.length;

    return ratio > 0.25; // If >25% of stools are abnormal while having pain -> High IBS likelihood
  }

  /**
   * Statistical Anomaly Detection
   * Uses standard deviation to find if the user's bowel habits are erratic.
   */
  private static detectBristolAnomalies(entries: StoolEntry[]): { isAnomalous: boolean; variance: number } {
    const bristolValues = entries.map(e => e.bristolType);
    const mean = bristolValues.reduce((a, b) => a + b, 0) / bristolValues.length;
    const variance = bristolValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / bristolValues.length;
    const stdDev = Math.sqrt(variance);

    // Normal Bristol type is 3-4. High variance means alternating constipation/diarrhea.
    // A variance > 2.0 implies a spread covering almost the whole scale (e.g. 1s and 7s).
    return {
      isAnomalous: stdDev > 1.5,
      variance
    };
  }

  /**
   * Critical Rule-Based Checks
   */
  private static checkRedFlags(entries: StoolEntry[]): string[] {
    const flags: string[] = [];
    const recent = entries.slice(0, 5); // Check last 5

    // Blood check
    if (recent.some(e => e.color === 'red' || e.color === 'black')) {
      flags.push('CRITICAL: Red or Black stool detected. This may indicate bleeding (Red -> Lower GI, Black/Tarry -> Upper GI). Consult a doctor immediately.');
    }

    // Chronic issue check (e.g. 10 days of Type 7)
    // ...
    
    return flags;
  }

  /**
   * Heuristic Scoring Algorithm
   * 100 - (penalties)
   */
  private static calculateHealthScore(entries: StoolEntry[], issueCount: number): number {
    let score = 100;
    const recent = entries.slice(0, 10);
    
    // Penalty for abnormal bristol (Ideal: 3, 4)
    for (const entry of recent) {
        const dist = Math.abs(entry.bristolType - 3.5); // 3.5 is midpoint of 3 and 4
        if (dist > 1.5) score -= 5; // Penalty for 1, 2, 6, 7
    }

    // Penalty for findings
    score -= (issueCount * 10);

    return Math.max(0, Math.round(score));
  }
}
