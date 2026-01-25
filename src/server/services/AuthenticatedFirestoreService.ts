/**
 * Authenticated Firestore REST API service for Devvit
 * Uses service account authentication to access private Firestore projects
 */

export interface QuizData {
  id: string;
  questions: Array<{
    question: string;
    answers: string[];
    correctAnswer: string;
  }>;
  metadata: {
    generatedAt: string;
    topic: string;
    difficulty: string;
    source: string;
  };
}

export class AuthenticatedFirestoreService {
  // @ts-expect-error - projectId is used in baseUrl construction
  private readonly projectId: string;
  private readonly baseUrl: string;

  constructor(projectId: string = 'streax-bot-local') {
    this.projectId = projectId;
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  }

  /**
   * Get today's quiz from Firestore using REST API (public access)
   */
  async getTodaysQuiz(): Promise<QuizData | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const documentPath = `daily-quizzes/${today}`;
      const url = `${this.baseUrl}/${documentPath}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      // Response received

      if (!response.ok) {
        if (response.status === 404) {
          // No quiz found for today
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse Firestore document format
      return this.parseFirestoreDocument(data);
    } catch (error) {
      // Error fetching quiz
      return null;
    }
  }

  /**
   * Parse Firestore document format to our QuizData format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseFirestoreDocument(doc: any): QuizData {
    const fields = doc.fields;

    // Parse questions array - handling the actual format from our quiz generator
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions = fields.questions.arrayValue.values.map((questionDoc: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qFields = questionDoc.mapValue.fields as any;
      const options = qFields.options.arrayValue.values.map(
        (opt: { stringValue?: string }) => opt.stringValue || ''
      );
      const correctAnswerIndex = Number(qFields.correctAnswer?.integerValue ?? 0);

      return {
        question: String(qFields.question.stringValue),
        answers: options,
        correctAnswer: options[correctAnswerIndex], // Convert index to actual answer
      } as QuizData['questions'][0];
    });

    // Parse metadata - handling the actual format from our quiz generator
    const metadataFields = fields.metadata.mapValue.fields;
    const metadata = {
      generatedAt: metadataFields.generatedAt.stringValue,
      topic: 'Gaming',
      difficulty: 'mixed',
      source: metadataFields.sourceWikis?.arrayValue?.values?.[0]?.stringValue || 'Gaming Wiki',
    };

    return {
      id: fields.id.stringValue,
      questions,
      metadata,
    };
  }

  /**
   * Test connection to Firestore (public access)
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Testing connection

      // Try a simple list operation to test connectivity
      const response = await fetch(`${this.baseUrl}/daily-quizzes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Test response received

      if (response.ok || response.status === 200) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      // Connection test error
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
