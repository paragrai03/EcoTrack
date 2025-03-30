import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { auth, db } from './config/firebase';
import { getDocs, query, collection, where } from 'firebase/firestore';

// Pages
import Landing from './pages/Landing';
import UserDashboard from './pages/UserDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AgencyDashboard from './pages/AgencyDashboard';

const theme = createTheme({
  palette: {
    primary: {
      light: '#4caf50',
      main: '#2E7D32',
      dark: '#1b5e20',
      contrastText: '#fff',
    },
    secondary: {
      light: '#ffb74d',
      main: '#FFA000',
      dark: '#f57c00',
      contrastText: '#000',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkUserRole = async () => {
      const user = auth.currentUser;
      
      if (!user) {
        navigate('/');
        return;
      }

      try {
        // First check by email domain
        let userRole = user.email?.includes('@driver.com') ? 'driver' :
                       user.email?.includes('@agency.com') ? 'agency' : 'user';
        
        // Then check Firestore for a more accurate role
        const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          if (userData.role) {
            userRole = userData.role;
          }
        }

        if (allowedRoles.includes(userRole)) {
          setHasAccess(true);
        } else {
          // Redirect to appropriate dashboard based on role
          navigate(`/${userRole}-dashboard`);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [allowedRoles, navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return hasAccess ? <>{children}</> : null;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route 
            path="/user-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <UserDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/driver-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/agency-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['agency']}>
                <AgencyDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App; 