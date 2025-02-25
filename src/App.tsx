import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { toast, Toaster } from 'react-hot-toast';
import { ClipboardList, Camera, UserCheck, AlertCircle, AlertTriangle } from 'lucide-react';
import { supabase } from './lib/supabase';

interface Student {
  id: string;
  student_id: string;
  name: string;
  class: string;
  section: string;
}

interface Grievance {
  id: string;
  student_id: string;
  type: string;
  description: string;
  date: string;
  students?: {
    name: string;
    class: string;
    section: string;
  };
}

interface WeeklyStats {
  student_name: string;
  count: number;
  types: string[];
}

const GRIEVANCE_TYPES = [
  'Uniform',
  'Shoes',
  'Hair Cut',
  'Late Arrival',
  'ID Card Missing',
  'Other'
];

function App() {
  const [scanning, setScanning] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [grievanceType, setGrievanceType] = useState('');
  const [description, setDescription] = useState('');
  const [recentGrievances, setRecentGrievances] = useState<Grievance[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    loadRecentGrievances();
    loadWeeklyStats();
  }, []);

  useEffect(() => {
    if (scanning && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scannerRef.current.render(handleScan, handleError);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [scanning]);

  const loadWeeklyStats = async () => {
    const start = startOfWeek(new Date()).toISOString();
    const end = endOfWeek(new Date()).toISOString();

    const { data, error } = await supabase
      .from('grievances')
      .select(`
        *,
        students (
          name,
          class,
          section
        )
      `)
      .gte('date', start)
      .lte('date', end);

    if (error) {
      toast.error('Failed to load weekly statistics');
      return;
    }

    // Process data to get weekly statistics
    const stats = data.reduce((acc: { [key: string]: WeeklyStats }, grievance) => {
      const studentName = grievance.students?.name || 'Unknown';
      
      if (!acc[studentName]) {
        acc[studentName] = {
          student_name: studentName,
          count: 0,
          types: []
        };
      }
      
      acc[studentName].count++;
      if (!acc[studentName].types.includes(grievance.type)) {
        acc[studentName].types.push(grievance.type);
      }
      
      return acc;
    }, {});

    setWeeklyStats(Object.values(stats).sort((a, b) => b.count - a.count));
  };

  const loadRecentGrievances = async () => {
    const { data, error } = await supabase
      .from('grievances')
      .select(`
        *,
        students (
          name,
          class,
          section
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      toast.error('Failed to load recent grievances');
    } else {
      setRecentGrievances(data || []);
    }
  };

  const handleScan = async (decodedText: string) => {
    const studentId = decodedText;
    const { data: studentData, error } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (error) {
      toast.error('Student not found');
    } else {
      setSelectedStudent(studentData);
      setScanning(false);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    toast.error('Error accessing camera');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !grievanceType) return;

    const { error } = await supabase
      .from('grievances')
      .insert({
        student_id: selectedStudent.id,
        type: grievanceType,
        description,
        date: new Date().toISOString()
      });

    if (error) {
      toast.error('Failed to submit grievance');
    } else {
      toast.success('Grievance recorded successfully');
      setGrievanceType('');
      setDescription('');
      setSelectedStudent(null);
      loadRecentGrievances();
      loadWeeklyStats();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            <h1 className="text-xl font-bold">School Discipline Tracker</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Scanner and Form */}
          <div className="space-y-6">
            {/* Scanner Section */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              {scanning ? (
                <div className="aspect-square relative">
                  <div id="qr-reader" className="w-full"></div>
                  <button
                    onClick={() => setScanning(false)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setScanning(true)}
                  className="w-full py-4 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center gap-2"
                >
                  <Camera className="h-5 w-5" />
                  Scan Student ID
                </button>
              )}
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
              {selectedStudent && (
                <div className="bg-green-50 p-4 rounded-lg flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h3 className="font-medium text-green-900">{selectedStudent.name}</h3>
                    <p className="text-sm text-green-700">
                      Class: {selectedStudent.class} | Section: {selectedStudent.section}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grievance Type
                </label>
                <select
                  value={grievanceType}
                  onChange={(e) => setGrievanceType(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select type...</option>
                  {GRIEVANCE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={!selectedStudent || !grievanceType}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Record Grievance
              </button>
            </form>
          </div>

          {/* Right Column - Weekly Stats and Recent Grievances */}
          <div className="space-y-6">
            {/* Weekly Statistics */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4">Weekly Repeat Offenders</h2>
              <div className="space-y-4">
                {weeklyStats.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No grievances recorded this week</p>
                  </div>
                ) : (
                  weeklyStats.map((stat) => (
                    <div
                      key={stat.student_name}
                      className={`p-4 rounded-lg ${
                        stat.count >= 3 ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {stat.count >= 3 && (
                          <AlertTriangle className="h-5 w-5 text-red-500 mt-1" />
                        )}
                        <div>
                          <h3 className={`font-medium ${
                            stat.count >= 3 ? 'text-red-700' : 'text-gray-900'
                          }`}>
                            {stat.student_name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {stat.count} grievance{stat.count !== 1 ? 's' : ''} this week
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Types: {stat.types.join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Grievances */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4">Recent Grievances</h2>
              <div className="space-y-4">
                {recentGrievances.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No recent grievances recorded</p>
                  </div>
                ) : (
                  recentGrievances.map((grievance) => (
                    <div
                      key={grievance.id}
                      className="border-l-4 border-indigo-500 pl-4 py-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{grievance.type}</h3>
                          <p className="text-sm text-gray-600">{grievance.description}</p>
                          {grievance.students && (
                            <p className="text-sm text-gray-500 mt-1">
                              {grievance.students.name} ({grievance.students.class}-{grievance.students.section})
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(grievance.date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;