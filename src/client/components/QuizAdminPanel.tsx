import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizGenerationResult {
  success: boolean;
  message: string;
  questionsGenerated?: number;
  error?: string;
  timestamp: string;
}

interface QuizManagementStatus {
  lastGeneration: string | null;
  isGenerating: boolean;
  totalQuizzes: number;
  lastError?: string;
}

interface ConfigTestResult {
  success: boolean;
  details: string[];
}

export const QuizAdminPanel: React.FC = () => {
  const [status, setStatus] = useState<QuizManagementStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<QuizGenerationResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [configTest, setConfigTest] = useState<ConfigTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Load initial status
  useEffect(() => {
    void loadStatus();
    void loadLogs();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/admin/quiz/status');
      if (response.ok) {
        const statusData = await response.json();
        setStatus(statusData);
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/admin/quiz/logs');
      if (response.ok) {
        const logsData = await response.json();
        setLogs(logsData.logs || []);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const generateQuiz = async () => {
    setIsGenerating(true);
    setLoading(true);
    try {
      const response = await fetch('/api/admin/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      setLastResult(result);
      
      // Refresh status after generation
      setTimeout(() => {
        void loadStatus();
        void loadLogs();
      }, 1000);
      
    } catch (error) {
      setLastResult({
        success: false,
        message: 'Failed to connect to generation service',
        error: error instanceof Error ? error.message : 'Network error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

  const testConfiguration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/quiz/test-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      setConfigTest(result);
    } catch (error) {
      setConfigTest({
        success: false,
        details: [`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '24px',
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        border: '1px solid #333',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <h2 style={{ 
        marginBottom: '24px', 
        fontSize: '24px', 
        fontWeight: 'bold',
        textAlign: 'center',
        background: 'linear-gradient(45deg, #7c3aed, #3b82f6)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent'
      }}>
        🎮 Quiz Management Dashboard
      </h2>

      {/* Status Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          border: '1px solid #444'
        }}>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>Total Quizzes</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed' }}>
            {status?.totalQuizzes ?? '—'}
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          border: '1px solid #444'
        }}>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>Last Generation</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#22c55e' }}>
            {formatTimestamp(status?.lastGeneration)}
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          border: '1px solid #444'
        }}>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>Status</div>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 'bold', 
            color: status?.isGenerating ? '#f59e0b' : '#22c55e' 
          }}>
            {status?.isGenerating ? '🔄 Generating...' : '✅ Ready'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generateQuiz}
          disabled={isGenerating || loading}
          style={{
            padding: '12px 24px',
            backgroundColor: isGenerating ? '#6b7280' : '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.6 : 1,
            fontSize: '14px'
          }}
        >
          {isGenerating ? '🔄 Generating...' : '🎲 Generate New Quiz'}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={testConfiguration}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontSize: '14px'
          }}
        >
          🔧 Test Config
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { void loadStatus(); void loadLogs(); }}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontSize: '14px'
          }}
        >
          🔄 Refresh
        </motion.button>
      </div>

      {/* Last Generation Result */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: '16px',
              backgroundColor: lastResult.success ? '#065f46' : '#7f1d1d',
              borderRadius: '8px',
              marginBottom: '24px',
              border: `1px solid ${lastResult.success ? '#059669' : '#dc2626'}`
            }}
          >
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {lastResult.success ? '✅' : '❌'} 
              {lastResult.message}
            </div>
            {lastResult.questionsGenerated && (
              <div style={{ fontSize: '14px', color: '#d1d5db' }}>
                Generated {lastResult.questionsGenerated} questions
              </div>
            )}
            {lastResult.error && (
              <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '4px' }}>
                Error: {lastResult.error}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
              {formatTimestamp(lastResult.timestamp)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configuration Test Result */}
      <AnimatePresence>
        {configTest && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: '16px',
              backgroundColor: configTest.success ? '#065f46' : '#7f1d1d',
              borderRadius: '8px',
              marginBottom: '24px',
              border: `1px solid ${configTest.success ? '#059669' : '#dc2626'}`
            }}
          >
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              marginBottom: '8px'
            }}>
              {configTest.success ? '✅ Configuration Test Passed' : '❌ Configuration Issues Found'}
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              {configTest.details.map((detail, index) => (
                <div key={index} style={{ marginBottom: '2px' }}>
                  {detail}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Logs */}
      <div style={{
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        border: '1px solid #444',
        padding: '16px'
      }}>
        <h3 style={{ 
          marginBottom: '12px', 
          fontSize: '16px', 
          fontWeight: 'bold',
          color: '#d1d5db'
        }}>
          📜 Recent Activity
        </h3>
        <div style={{
          maxHeight: '200px',
          overflowY: 'auto',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#9ca3af'
        }}>
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '4px', padding: '2px 0' }}>
                {log}
              </div>
            ))
          ) : (
            <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
              No recent activity logs
            </div>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#374151',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#d1d5db'
      }}>
        <strong>💡 How to use:</strong>
        <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
          <li>Click "Generate New Quiz" to create fresh questions using AI</li>
          <li>Use "Test Config" to verify your quiz generator setup</li>
          <li>Questions are automatically saved to Firestore for the app to use</li>
          <li>Generation takes 1-2 minutes depending on AI response time</li>
        </ul>
      </div>
    </motion.div>
  );
};
