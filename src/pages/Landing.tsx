import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  useMediaQuery,
  useTheme,
  IconButton,
  Checkbox,
  FormControlLabel,
  Paper,
  Tab,
  Tabs,
  InputAdornment,
  Avatar,
  Stack,
  Tooltip,
  Fade,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { doc, setDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import RecyclingIcon from '@mui/icons-material/Recycling';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MapIcon from '@mui/icons-material/Map';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LoginIcon from '@mui/icons-material/Login';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';

const Landing: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState('user');
  const [openLoginDialog, setOpenLoginDialog] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // Set persistence based on remember me checkbox
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);
      
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        
        // Determine role based on email or from Firestore
        let userRole = 'user'; // default role
        
        // First check if the email contains role indicators
        if (email.includes('@driver.com')) {
          userRole = 'driver';
        } else if (email.includes('@agency.com')) {
          userRole = 'agency';
        } else {
          // If no role indicator in email, try to get role from Firestore
          const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            if (userData.role) {
              userRole = userData.role;
            }
          }
        }
        
        console.log(`User logged in with role: ${userRole}`);
        navigate(`/${userRole}-dashboard`);
      } else {
        // For sign up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Determine initial role if not explicitly selected
        const actualRole = role || (
          email.includes('@driver.com') ? 'driver' : 
          email.includes('@agency.com') ? 'agency' : 
          'user'
        );
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: email,
          role: actualRole,
          points: actualRole === 'user' ? 0 : null,
          createdAt: new Date(),
        });
        
        console.log(`User created with role: ${actualRole}`);
        navigate(`/${actualRole}-dashboard`);
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Please use a different email or login.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection and try again.');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else {
        setError(isLogin 
          ? 'Error signing in. Please try again.' 
          : 'Error creating account. Please try again.');
      }
    }
  };

  const handleOpenLoginDialog = () => {
    setOpenLoginDialog(true);
  };

  const handleCloseLoginDialog = () => {
    setOpenLoginDialog(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Feature items
  const features = [
    {
      icon: <RecyclingIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      title: 'Smart Waste Collection',
      description: 'Optimize your waste collection routes and reduce operational costs with AI-powered scheduling.'
    },
    {
      icon: <LocalShippingIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      title: 'In-Cab Navigation',
      description: 'Provide drivers with real-time navigation and task updates for faster, more accurate collections.'
    },
    {
      icon: <MapIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      title: 'Route Optimization',
      description: 'Reduce fuel consumption and vehicle wear with optimized collection routes.'
    },
    {
      icon: <AnalyticsIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      title: 'Waste Insights',
      description: 'Turn collection data into actionable insights with real-time analytics and reporting.'
    },
    {
      icon: <EmojiEventsIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      title: 'Points System',
      description: 'Reward eco-friendly behavior with our innovative points system for recycling efforts.'
    },
    {
      icon: <GroupsIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      title: 'Customer Portal',
      description: 'Empower customers with self-service options for scheduling, payments, and analytics.'
    }
  ];

  // Stats
  const stats = [
    { value: '37%', label: 'Reduction in Operational Costs' },
    { value: '40%', label: 'Less Collections Required' },
    { value: '95%', label: 'Increase in Collection Accuracy' }
  ];

  // Testimonials
  const testimonials = [
    {
      quote: "EcoTrack has reduced our total number of collections across all waste fractions by an average of 40%.",
      author: "Christian M.",
      role: "Project Leader, Green City"
    },
    {
      quote: "The initial installation secured 53% less collections, which provided us with significant savings and reduced CO2 emissions.",
      author: "Bjarne K.",
      role: "Civil Engineer, Sustainability Department"
    }
  ];

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      {/* Hero Section */}
      <Box sx={{ 
        bgcolor: 'primary.main', 
        color: 'white',
        py: { xs: 8, md: 10 },
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
        borderRadius: { md: '0 0 50px 50px' },
        boxShadow: 4,
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Typography 
                  variant="h2" 
                  component="h1" 
                  fontWeight="bold" 
                  gutterBottom
                  sx={{ 
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                  }}
                >
                  A New Way for Waste Management
                </Typography>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    mb: 4, 
                    opacity: 0.9,
                    maxWidth: '90%',
                    lineHeight: 1.5
                  }}
                >
                  Powerful Waste Management Software for Smart, Sustainable Operations
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button 
                    variant="contained" 
                    size="large"
                    color="secondary"
                    onClick={handleOpenLoginDialog}
                    endIcon={<ArrowForwardIcon />}
                    sx={{ 
                      py: 1.5, 
                      px: 4, 
                      fontSize: '1.1rem',
                      boxShadow: 4,
                      borderRadius: 8,
                      "&:hover": {
                        transform: 'translateY(-3px)',
                        boxShadow: 6,
                      },
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                  >
                    Get Started
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="large"
                    sx={{ 
                      py: 1.5, 
                      px: 4, 
                      fontSize: '1.1rem',
                      borderRadius: 8,
                      borderColor: 'white',
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Learn More
                  </Button>
                </Stack>
              </Box>
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box sx={{ 
                position: 'relative', 
                height: '400px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.2)',
                transform: 'perspective(1000px) rotateY(-10deg)',
                transition: 'transform 0.5s',
                '&:hover': {
                  transform: 'perspective(1000px) rotateY(-5deg) translateY(-10px)',
                }
              }}>
                <Box sx={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
                  <RecyclingIcon sx={{ 
                    position: 'absolute', 
                    top: '10%', 
                    left: '10%', 
                    fontSize: 40,
                    opacity: 0.8
                  }} />
                  <LocalShippingIcon sx={{ 
                    position: 'absolute', 
                    top: '40%', 
                    left: '20%', 
                    fontSize: 30,
                    opacity: 0.8
                  }} />
                  <AnalyticsIcon sx={{ 
                    position: 'absolute', 
                    top: '70%', 
                    left: '15%', 
                    fontSize: 35,
                    opacity: 0.8
                  }} />
                  <MapIcon sx={{ 
                    position: 'absolute', 
                    top: '20%', 
                    right: '15%', 
                    fontSize: 30,
                    opacity: 0.8
                  }} />
                  <EmojiEventsIcon sx={{ 
                    position: 'absolute', 
                    top: '50%', 
                    right: '20%', 
                    fontSize: 35,
                    opacity: 0.8
                  }} />
                  <GroupsIcon sx={{ 
                    position: 'absolute', 
                    top: '80%', 
                    right: '15%', 
                    fontSize: 40,
                    opacity: 0.8
                  }} />
                </Box>
                
                <Box sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(255,255,255,0.1)', 
                  borderRadius: 2, 
                  backdropFilter: 'blur(5px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  zIndex: 1
                }}>
                  <Typography variant="h4" sx={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                    EcoTrack
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
                    Smart Waste Management
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8, mt: 4 }}>
        <Box textAlign="center" mb={6}>
          <Typography 
            variant="h3" 
            component="h2" 
            fontWeight="bold" 
            gutterBottom
            sx={{ 
              position: 'relative',
              display: 'inline-block',
              '&::after': {
                content: '""',
                position: 'absolute',
                width: '80px',
                height: '4px',
                bgcolor: 'primary.main',
                bottom: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderRadius: '4px'
              }
            }}
          >
            Unify Your Operations with One Platform
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ 
              maxWidth: '800px', 
              mx: 'auto', 
              mt: 4,
              fontSize: '1.1rem',
              lineHeight: 1.6 
            }}
          >
            EcoTrack is the waste management software that simplifies your operations. Automate tasks, optimize routes, and reduce costs—all from a single, unified platform.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  borderRadius: 4,
                  overflow: 'hidden',
                  "&:hover": {
                    transform: 'translateY(-8px)',
                    boxShadow: 10
                  }
                }}
                elevation={3}
              >
                <Box sx={{ 
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  p: 3,
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <Avatar 
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main'
                    }}
                  >
                    {React.cloneElement(feature.icon, { sx: { fontSize: 40 } })}
                  </Avatar>
                </Box>
                <CardContent sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  textAlign: 'center', 
                  flexGrow: 1,
                  px: 3,
                  pt: 3,
                  pb: 4
                }}>
                  <Typography variant="h5" component="h3" gutterBottom fontWeight="bold">
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Stats Section */}
      <Box sx={{ 
        py: 10, 
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          bgcolor: 'primary.dark',
          opacity: 0.97,
          zIndex: 0
        }
      }}>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography 
            variant="h3" 
            component="h2" 
            textAlign="center" 
            fontWeight="bold" 
            gutterBottom
            color="white"
            sx={{ 
              position: 'relative',
              mb: 1,
              display: 'inline-block',
              width: '100%',
            }}
          >
            Global Impact and Industry Leadership
          </Typography>
          <Typography 
            variant="h6" 
            textAlign="center" 
            sx={{ 
              color: 'rgba(255,255,255,0.85)', 
              mb: 8, 
              maxWidth: '800px', 
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            We are the trusted choice for cities and companies striving for efficiency, sustainability, and innovation
          </Typography>

          <Grid container spacing={5} justifyContent="center">
            {stats.map((stat, index) => (
              <Grid item xs={12} sm={4} key={index}>
                <Card sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                  p: 1,
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h2" component="div" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      {stat.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Testimonials */}
      <Container maxWidth="lg" sx={{ py: 10, mt: 4 }}>
        <Typography 
          variant="h3" 
          component="h2" 
          textAlign="center" 
          fontWeight="bold" 
          gutterBottom
          sx={{ 
            position: 'relative',
            display: 'inline-block',
            width: '100%',
            '&::after': {
              content: '""',
              position: 'absolute',
              width: '80px',
              height: '4px',
              bgcolor: 'primary.main',
              bottom: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              borderRadius: '4px'
            }
          }}
        >
          Trusted by Industry Leaders
        </Typography>
        <Typography 
          variant="h6" 
          textAlign="center" 
          color="text.secondary" 
          sx={{ 
            mb: 6, 
            maxWidth: '800px', 
            mx: 'auto',
            mt: 4,
            lineHeight: 1.6
          }}
        >
          See what our customers have to say about their experience with EcoTrack
        </Typography>

        <Grid container spacing={4}>
          {testimonials.map((testimonial, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: 3,
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6
                }
              }}>
                <CardContent sx={{ flexGrow: 1, p: 4 }}>
                  <Box sx={{ display: 'flex', mb: 3 }}>
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
                    ))}
                  </Box>
                  <Typography 
                    variant="body1" 
                    paragraph 
                    sx={{ 
                      fontSize: '1.1rem', 
                      fontStyle: 'italic',
                      color: 'text.primary',
                      lineHeight: 1.7,
                      position: 'relative',
                      '&::before': {
                        content: '"""',
                        fontSize: '4rem',
                        position: 'absolute',
                        top: '-1.5rem',
                        left: '-0.5rem',
                        opacity: 0.1,
                        color: 'primary.main',
                        fontFamily: 'serif'
                      }
                    }}
                  >
                    {testimonial.quote}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                      {testimonial.author.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {testimonial.author}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {testimonial.role}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box sx={{ 
        py: 10, 
        backgroundImage: `linear-gradient(135deg, ${theme.palette.secondary.dark}, ${theme.palette.secondary.main})`,
        borderRadius: { md: '50px 50px 0 0' },
        mt: 8,
        boxShadow: '0 -10px 30px rgba(0,0,0,0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Container maxWidth="md">
          <Box textAlign="center" position="relative" zIndex="1">
            <Typography 
              variant="h3" 
              component="h2" 
              fontWeight="bold" 
              gutterBottom
              color="white"
              sx={{ 
                textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                fontSize: { xs: '2rem', md: '2.75rem' }
              }}
            >
              Unite, Simplify, and Power Your Waste Management
            </Typography>
            <Typography 
              variant="h6" 
              paragraph 
              sx={{ 
                mb: 5, 
                maxWidth: '800px', 
                mx: 'auto',
                color: 'rgba(255,255,255,0.9)',
                lineHeight: 1.6
              }}
            >
              Boost efficiency and cut costs with modular software tailored to your operations. Don't wait—unlock your business's full potential today.
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              color="primary"
              onClick={handleOpenLoginDialog}
              endIcon={<ArrowForwardIcon />}
              sx={{ 
                py: 2, 
                px: 5, 
                fontSize: '1.15rem',
                boxShadow: 4,
                borderRadius: 8,
                bgcolor: 'white',
                color: 'secondary.dark',
                '&:hover': {
                  bgcolor: 'white',
                  transform: 'translateY(-3px)',
                  boxShadow: 6
                },
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              Get Started Now
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ 
        bgcolor: 'background.paper', 
        py: 6,
        borderTop: '1px solid',
        borderColor: 'divider'
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <RecyclingIcon sx={{ fontSize: 30, color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  EcoTrack
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: '300px' }}>
                Your Smart Waste Management Solution for a sustainable future.
              </Typography>
              <Stack direction="row" spacing={1}>
                {['facebook', 'twitter', 'linkedin', 'instagram'].map((social) => (
                  <IconButton key={social} color="primary" size="small" sx={{ 
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <Box component="span" sx={{ 
                      width: 20, 
                      height: 20, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center'
                    }}>
                      {social.charAt(0).toUpperCase()}
                    </Box>
                  </IconButton>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Features
              </Typography>
              <Box component="ul" sx={{ pl: 0, listStyle: 'none' }}>
                {['Smart Waste Collection', 'Route Optimization', 'Waste Insights', 'Points System'].map((item, i) => (
                  <Box component="li" sx={{ mb: 1.5 }} key={i}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'primary.main', mr: 1 }} />
                      <Typography variant="body2">{item}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Solutions For
              </Typography>
              <Box component="ul" sx={{ pl: 0, listStyle: 'none' }}>
                {['Municipal Utilities', 'Waste Collectors', 'Private Users', 'Environmental Agencies'].map((item, i) => (
                  <Box component="li" sx={{ mb: 1.5 }} key={i}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'primary.main', mr: 1 }} />
                      <Typography variant="body2">{item}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" align="center">
              © {new Date().getFullYear()} EcoTrack – All rights reserved
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Login Dialog */}
      <Dialog 
        open={openLoginDialog} 
        onClose={handleCloseLoginDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
            overflow: 'hidden',
          }
        }}
      >
        <Box sx={{ 
          backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center' 
        }}>
          <Avatar 
            sx={{ 
              width: 60, 
              height: 60, 
              bgcolor: 'white',
              mb: 2
            }}
          >
            <RecyclingIcon color="primary" sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h4" color="white" fontWeight="bold" align="center" gutterBottom>
            Welcome to EcoTrack
          </Typography>
          <Typography variant="body1" color="white" align="center">
            {isLogin ? 'Sign in to your account to continue' : 'Create an account to get started'}
          </Typography>
        </Box>
        
        <Tabs
          value={isLogin ? 0 : 1}
          onChange={(_, newValue) => setIsLogin(newValue === 0)}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Tab 
            icon={<LoginIcon sx={{ mr: 1 }} />} 
            iconPosition="start" 
            label="Sign In" 
            sx={{ py: 2 }}
          />
          <Tab 
            icon={<PersonAddIcon sx={{ mr: 1 }} />} 
            iconPosition="start" 
            label="Sign Up" 
            sx={{ py: 2 }}
          />
        </Tabs>
        
        <DialogContent sx={{ p: 4, mt: 1 }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3, borderRadius: 1 }}
              variant="filled"
            >
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="primary" />
                  </InputAdornment>
                ),
              }}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={togglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            {!isLogin && (
              <FormControl fullWidth margin="normal" variant="outlined" sx={{ mb: 2 }}>
                <InputLabel id="role-label">Role</InputLabel>
                <Select
                  labelId="role-label"
                  id="role"
                  value={role}
                  label="Role"
                  onChange={(e) => setRole(e.target.value)}
                >
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="driver">Driver</MenuItem>
                  <MenuItem value="agency">Agency</MenuItem>
                </Select>
              </FormControl>
            )}
            
            {isLogin && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={rememberMe} 
                      onChange={(e) => setRememberMe(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Remember me"
                />
                <Button color="primary" size="small">
                  Forgot password?
                </Button>
              </Box>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              startIcon={isLogin ? <LoginIcon /> : <PersonAddIcon />}
              sx={{ 
                mt: 2, 
                mb: 3, 
                py: 1.5,
                borderRadius: 2,
                boxShadow: 3,
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-2px)',
                },
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
            
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Typography variant="body2" align="center">
                {isLogin 
                  ? "Don't have an account?" 
                  : "Already have an account?"
                }
                {' '}
                <Button 
                  onClick={() => setIsLogin(!isLogin)}
                  color="primary"
                  sx={{ fontWeight: 'bold', p: 0, minWidth: 'auto' }}
                >
                  {isLogin ? "Sign Up" : "Sign In"}
                </Button>
              </Typography>
            </Box>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Landing; 