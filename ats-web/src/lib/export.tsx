import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Link } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import {
  DEFAULT_SECTION_TITLES,
  type Language,
  type StructuredResume,
} from '@ats-analyzer/contracts';

// Define styles for ATS-friendly parsing
// Standard fonts, single column layout, clear hierarchies
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  headerName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  contactInfo: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 2,
    textTransform: 'uppercase',
  },
  experienceItem: {
    marginBottom: 8,
  },
  jobTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  companyDate: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  bulletPoint: {
    fontSize: 10,
    marginLeft: 10,
    marginBottom: 2,
    flexDirection: 'row',
  },
  bulletText: {
    flex: 1,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  skillsText: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  projectItem: {
    marginBottom: 6,
  },
  projectName: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  projectDesc: {
    fontSize: 10,
  },
});

// ATS-friendly localized resume template builder
function createResumeDocument(data: StructuredResume, language: Language = 'en') {
  const titles = data.sectionTitles
    ? { ...DEFAULT_SECTION_TITLES[language], ...data.sectionTitles }
    : DEFAULT_SECTION_TITLES[language] || DEFAULT_SECTION_TITLES.en;

  const presentText = language === 'tr' ? 'Günümüz' : 'Present';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View>
          <Text style={styles.headerName}>{data.contact?.name || 'Applicant'}</Text>
          <Text style={styles.contactInfo}>
            {data.contact?.email}
            {data.contact?.phone ? ` | ${data.contact.phone}` : ''}
            {data.contact?.links?.map((link: string, i: number) => (
              <React.Fragment key={i}>
                {' '}| <Link src={link}>{link}</Link>
              </React.Fragment>
            ))}
          </Text>
        </View>

        {/* SUMMARY */}
        {data.summary ? (
          <View>
            <Text style={styles.sectionTitle}>{titles.summary}</Text>
            <Text style={styles.summaryText}>{data.summary}</Text>
          </View>
        ) : null}

        {/* SKILLS */}
        {data.skills && data.skills.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>{titles.skills}</Text>
            <Text style={styles.skillsText}>{data.skills.join(', ')}</Text>
          </View>
        ) : null}

        {/* EXPERIENCE */}
        {data.experience && data.experience.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>{titles.experience}</Text>
            {data.experience.map((exp, i) => (
              <View key={i} style={styles.experienceItem}>
                <View style={styles.jobTitleRow}>
                  <Text style={styles.jobTitle}>{exp.title}</Text>
                  <Text style={styles.companyDate}>
                    {exp.company} | {exp.startDate} - {exp.endDate || presentText}
                  </Text>
                </View>
                {exp.description ? (
                  <Text style={styles.summaryText}>{exp.description}</Text>
                ) : null}
                {exp.bullets?.map((bullet: string, j: number) => (
                  <View key={j} style={styles.bulletPoint}>
                    <Text>• </Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* EDUCATION */}
        {data.education && data.education.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>{titles.education}</Text>
            {data.education.map((edu, i) => (
              <View key={i} style={styles.jobTitleRow}>
                <Text style={styles.jobTitle}>{edu.degree}</Text>
                <Text style={styles.companyDate}>
                  {edu.institution} | {edu.startDate} - {edu.endDate || presentText}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* PROJECTS */}
        {data.projects && data.projects.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>{titles.projects}</Text>
            {data.projects.map((proj, i) => (
              <View key={i} style={styles.projectItem}>
                <Text style={styles.projectName}>
                  {proj.name}
                  {proj.link ? ` (${proj.link})` : ''}
                </Text>
                {proj.description ? (
                  <Text style={styles.projectDesc}>{proj.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

/**
 * Generates and downloads the PDF to the user's browser with bilingual support
 */
export async function generateAndDownloadPDF(
  resumeData: StructuredResume,
  filename = 'resume-ats-optimized.pdf',
  language: Language = 'en'
): Promise<void> {
  try {
    const doc = createResumeDocument(resumeData, language);
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    saveAs(blob, filename);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw new Error('PDF generation failed');
  }
}
