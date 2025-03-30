import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Alert,
  Snackbar,
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  useTheme,
  alpha,
  Chip,
  CircularProgress,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Badge,
  Drawer,
  Fab,
  Tooltip,
} from '@mui/material';
import { GoogleMap, LoadScript, Marker, useJsApiLoader } from '@react-google-maps/api';
import { db, auth } from '../config/firebase';
import { collection, addDoc, query, where, getDocs, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import AddIcon from '@mui/icons-material/Add';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StarIcon from '@mui/icons-material/Star';
import PersonIcon from '@mui/icons-material/Person';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import HistoryIcon from '@mui/icons-material/History';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import RefreshIcon from '@mui/icons-material/Refresh';
import RecyclingIcon from '@mui/icons-material/Recycling';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TimerIcon from '@mui/icons-material/Timer';
import HomeIcon from '@mui/icons-material/Home';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PendingIcon from '@mui/icons-material/Pending';
import CategoryIcon from '@mui/icons-material/Category';
import WasteClassifierChatbot from '../components/WasteClassifierChatbot';
import ChatIcon from '@mui/icons-material/Chat';

interface PickupRequest {
  id: string;
  date: string;
  time: string;
  address: string;
  wasteType: string;
  status: string;
  createdAt: Timestamp;
  userId: string;
  location?: {
    lat: number;
    lng: number;
  };
}

// Waste type options
const wasteTypes = [
  'Plastic',
  'Paper',
  'Glass',
  'Metal',
  'Electronic',
  'Organic',
  'Hazardous',
  'Mixed',
];

const UserDashboard: React.FC = () => {
  const theme = useTheme();
  const [points, setPoints] = useState(0);
  const [pickupRequests, setPickupRequests] = useState<PickupRequest[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newRequest, setNewRequest] = useState<Partial<PickupRequest>>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [notification, setNotification] = useState({ open: false, message: '', type: 'success' });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // Load Google Maps API with proper error handling
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    // Add libraries if needed
    // libraries: ['places']
  });

  useEffect(() => {
    // Get user's points and pickup requests
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        // Get user points and name
        const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
        const userDocs = await getDocs(userQuery);
        if (!userDocs.empty) {
          const userData = userDocs.docs[0].data();
          setPoints(userData.points || 0);
          setUserName(userData.name || user.displayName || user.email?.split('@')[0] || 'User');
        }

        // Subscribe to pickup requests for real-time updates
        const requestsQuery = query(
          collection(db, 'pickupRequests'), 
          where('userId', '==', user.uid)
        );
        
        const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
          const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as PickupRequest));
          
          // Sort by creation date (newest first)
          requests.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              return b.createdAt.seconds - a.createdAt.seconds;
            }
            return 0;
          });
          
          setPickupRequests(requests);
          console.log('Fetched pickup requests:', requests);
          setIsLoading(false);
        });

        return () => unsubscribe();
      }
    };

    fetchUserData();
  }, []);

  const handleSchedulePickup = async () => {
    const user = auth.currentUser;
    if (user && newRequest.date && newRequest.time && newRequest.address && newRequest.wasteType) {
      try {
        // Check if selected date is in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        const selectedDate = new Date(newRequest.date);
        
        if (selectedDate < today) {
          setNotification({
            open: true,
            message: 'Please select a future date for pickup',
            type: 'error'
          });
          return;
        }
        
        // Use the user's current location or fallback to a default
        const location = userLocation || { lat: 40.7128, lng: -74.0060 };
        
        const docRef = await addDoc(collection(db, 'pickupRequests'), {
          ...newRequest,
          userId: user.uid,
          userEmail: user.email,
          status: 'pending',
          createdAt: Timestamp.now(),
          location: location,
        });
        
        console.log('Pickup request created with ID:', docRef.id);
        
        setOpenDialog(false);
        setNewRequest({});
        setNotification({
          open: true,
          message: 'Pickup scheduled successfully!',
          type: 'success'
        });
      } catch (error) {
        console.error('Error scheduling pickup:', error);
        setNotification({
          open: true,
          message: 'Failed to schedule pickup. Please try again.',
          type: 'error'
        });
      }
    } else {
      setNotification({
        open: true,
        message: 'Please fill out all required fields',
        type: 'error'
      });
    }
  };

  const mapContainerStyle = {
    width: '100%',
    height: '100%',
  };

  const defaultCenter = {
    lat: 40.7128, // Default to NYC
    lng: -74.0060,
  };

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          console.log("User location obtained:", location);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  // Count pickups by status
  const pendingCount = pickupRequests.filter(r => r.status === 'pending').length;
  const acceptedCount = pickupRequests.filter(r => r.status === 'accepted').length;
  const completedCount = pickupRequests.filter(r => r.status === 'completed').length;

  const toggleChatbot = () => {
    setIsChatbotOpen(!isChatbotOpen);
  };

  return (
    <>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          bgcolor: 'background.paper', 
          borderBottom: `1px solid ${theme.palette.divider}` 
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <RecyclingIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
            <Typography variant="h5" color="primary" fontWeight="bold">
              User Dashboard
            </Typography>
          </Box>
          
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
              <StarIcon sx={{ color: theme.palette.warning.main, mr: 0.5 }} />
              <Typography variant="h6" color="text.primary" fontWeight="bold">
                {points} Points
              </Typography>
            </Box>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              sx={{ 
                mr: 2, 
                borderRadius: 8,
                textTransform: 'none'
              }}
            >
              Refresh
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary" sx={{ mr: 1 }}>
                {userName}
              </Typography>
              <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                <PersonIcon />
              </Avatar>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Hero section */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={4}>
                <Card 
                  sx={{ 
                    borderRadius: 2, 
                    boxShadow: 3,
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: 6,
                    } 
                  }}
                >
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ mb: 2, p: 1, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: '50%' }}>
                      <StarIcon sx={{ fontSize: 40, color: theme.palette.warning.main }} />
                    </Box>
                    <Typography variant="h5" color="warning.main" fontWeight="bold">{points}</Typography>
                    <Typography variant="subtitle1" color="text.secondary">Total Points</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card 
                  sx={{ 
                    borderRadius: 2, 
                    boxShadow: 3,
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: 6,
                    } 
                  }}
                >
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ mb: 2, p: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: '50%' }}>
                      <DeleteSweepIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                    </Box>
                    <Typography variant="h5" color="primary.main" fontWeight="bold">{pickupRequests.length}</Typography>
                    <Typography variant="subtitle1" color="text.secondary">Total Pickups</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card 
                  sx={{ 
                    borderRadius: 2, 
                    boxShadow: 3,
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: 6,
                    } 
                  }}
                >
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ mb: 2, p: 1, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: '50%' }}>
                      <CheckCircleIcon sx={{ fontSize: 40, color: theme.palette.success.main }} />
                    </Box>
                    <Typography variant="h5" color="success.main" fontWeight="bold">{completedCount}</Typography>
                    <Typography variant="subtitle1" color="text.secondary">Completed Pickups</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              {/* Map and Schedule Pickup Section - Made bigger */}
              <Grid item xs={12} md={8}>
                <Card sx={{ borderRadius: 2, boxShadow: 3, height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationOnIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                        <Typography variant="h6" fontWeight="bold">
                          Your Location
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                setUserLocation({
                                  lat: position.coords.latitude,
                                  lng: position.coords.longitude,
                                });
                              }
                            );
                          }
                        }}
                        sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                      >
                        <MyLocationIcon />
                      </IconButton>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ height: 450, width: '100%', position: 'relative', borderRadius: 1, overflow: 'hidden', mb: 3 }}>
                      {refreshing ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                          <CircularProgress />
                        </Box>
                      ) : loadError ? (
                        <Box 
                          sx={{ 
                            height: '100%', 
                            width: '100%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            bgcolor: 'grey.100',
                            borderRadius: 1,
                            flexDirection: 'column',
                            p: 2
                          }}
                        >
                          <Typography variant="body1" color="error" align="center">
                            Error loading Google Maps
                          </Typography>
                          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                            {loadError.message}
                          </Typography>
                        </Box>
                      ) : !isLoaded ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                          <CircularProgress />
                        </Box>
                      ) : (
                        <GoogleMap
                          mapContainerStyle={mapContainerStyle}
                          center={userLocation || defaultCenter}
                          zoom={12}
                          options={{
                            disableDefaultUI: true,
                            zoomControl: true,
                            styles: [
                              {
                                featureType: "poi",
                                elementType: "labels",
                                stylers: [{ visibility: "off" }]
                              }
                            ]
                          }}
                        >
                          {userLocation && (
                            <Marker 
                              position={userLocation} 
                              icon={{
                                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                                scaledSize: window.google?.maps?.Size ? new window.google.maps.Size(40, 40) : undefined
                              }}
                            />
                          )}
                          {pickupRequests.map((request) => (
                            request.location && (
                              <Marker
                                key={request.id}
                                position={request.location}
                                icon={{
                                  url: request.status === 'pending' 
                                    ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                                    : request.status === 'accepted'
                                    ? 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
                                    : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                                  scaledSize: window.google?.maps?.Size ? new window.google.maps.Size(32, 32) : undefined
                                }}
                              />
                            )
                          ))}
                        </GoogleMap>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenDialog(true)}
                        sx={{ 
                          borderRadius: 8,
                          textTransform: 'none',
                          fontWeight: 'bold',
                          px: 4,
                          py: 1.5
                        }}
                      >
                        Schedule New Pickup
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Pickup History - Made thinner */}
              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 2, boxShadow: 3, height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <HistoryIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                        <Typography variant="h6" fontWeight="bold">
                          Pickup History
                        </Typography>
                      </Box>
                      <Badge badgeContent={pendingCount} color="error" sx={{ mr: 1 }}>
                        <IconButton size="small" onClick={handleRefresh}>
                          <RefreshIcon />
                        </IconButton>
                      </Badge>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box sx={{ maxHeight: 480, overflow: 'auto', pb: 0 }}>
                      {refreshing ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                          <CircularProgress size={40} />
                        </Box>
                      ) : pickupRequests.length > 0 ? (
                        pickupRequests.map((request) => (
                          <Card 
                            key={request.id} 
                            sx={{ 
                              mb: 2, 
                              borderRadius: 2,
                              transition: 'transform 0.2s, box-shadow 0.2s',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: 2,
                              },
                              border: `1px solid ${alpha(
                                request.status === 'completed' 
                                  ? theme.palette.success.main 
                                  : request.status === 'accepted' 
                                    ? theme.palette.secondary.main 
                                    : theme.palette.primary.main,
                                0.3
                              )}`
                            }}
                          >
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight="medium">
                                  {request.wasteType} Pickup
                                </Typography>
                                <Chip 
                                  label={request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                  size="small"
                                  icon={
                                    request.status === 'completed' ? <CheckCircleIcon fontSize="small" /> :
                                    request.status === 'accepted' ? <LocalShippingIcon fontSize="small" /> :
                                    <PendingIcon fontSize="small" />
                                  }
                                  color={
                                    request.status === 'completed' ? 'success' :
                                    request.status === 'accepted' ? 'secondary' :
                                    'primary'
                                  }
                                  sx={{ fontWeight: 'bold' }}
                                />
                              </Box>
                              
                              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                                <Grid item xs={12} sm={6}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary', fontSize: 16 }} />
                                    <Typography variant="body2" color="text.secondary">
                                      {request.date}
                                    </Typography>
                                  </Box>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <TimerIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary', fontSize: 16 }} />
                                    <Typography variant="body2" color="text.secondary">
                                      {request.time}
                                    </Typography>
                                  </Box>
                                </Grid>
                                <Grid item xs={12}>
                                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                    <HomeIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary', fontSize: 16, mt: 0.5 }} />
                                    <Typography variant="body2" color="text.secondary">
                                      {request.address}
                                    </Typography>
                                  </Box>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                          <Typography variant="body1" color="text.secondary">
                            No pickup requests found. Schedule your first pickup!
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* AI Waste Classification Card - Moved to full width at bottom */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <RecyclingIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                        <Typography variant="h6" fontWeight="bold">
                          AI Waste Classification
                        </Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body1" paragraph>
                      Not sure how to sort your waste? Our AI can help identify the type of waste and provide recycling instructions.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<ChatIcon />}
                        onClick={toggleChatbot}
                        sx={{ 
                          py: 1.5, 
                          px: 3,
                          borderRadius: 8,
                          boxShadow: 2,
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 4,
                          },
                          transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                      >
                        Open Waste Classifier
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Container>

      {/* Floating Action Button for Chatbot on Mobile */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          display: { xs: 'block', md: 'none' },
          zIndex: 1000,
        }}
      >
        <Tooltip title="Waste Classifier">
          <Fab
            color="primary"
            onClick={toggleChatbot}
            sx={{
              boxShadow: 4,
            }}
          >
            <ChatIcon />
          </Fab>
        </Tooltip>
      </Box>

      {/* Schedule Pickup Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: `1px solid ${theme.palette.divider}`,
          pb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AddIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
            <Typography variant="h6" fontWeight="bold">
              Schedule Waste Pickup
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                margin="dense"
                label="Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newRequest.date || ''}
                onChange={(e) => setNewRequest({ ...newRequest, date: e.target.value })}
                variant="outlined"
                inputProps={{
                  min: new Date().toISOString().split('T')[0] // Set minimum date to today
                }}
                helperText="Select a future date"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Time"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newRequest.time || ''}
                onChange={(e) => setNewRequest({ ...newRequest, time: e.target.value })}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Address"
                type="text"
                fullWidth
                value={newRequest.address || ''}
                onChange={(e) => setNewRequest({ ...newRequest, address: e.target.value })}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined" margin="dense">
                <InputLabel id="waste-type-label">Waste Type</InputLabel>
                <Select
                  labelId="waste-type-label"
                  value={newRequest.wasteType || ''}
                  onChange={(e) => setNewRequest({ ...newRequest, wasteType: e.target.value })}
                  label="Waste Type"
                >
                  {wasteTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CategoryIcon fontSize="small" sx={{ mr: 1, color: theme.palette.primary.main }} />
                        {type}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button 
            onClick={() => setOpenDialog(false)} 
            sx={{ 
              borderRadius: 8,
              textTransform: 'none',
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSchedulePickup} 
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ 
              borderRadius: 8,
              textTransform: 'none',
              fontWeight: 'bold',
              px: 3
            }}
          >
            Schedule Pickup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Chatbot Drawer */}
      <Drawer
        anchor="right"
        open={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400 },
            maxWidth: '100%',
            borderTopLeftRadius: { xs: 0, sm: 12 },
            borderBottomLeftRadius: { xs: 0, sm: 12 },
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ height: '100vh' }}>
          <WasteClassifierChatbot onClose={() => setIsChatbotOpen(false)} />
        </Box>
      </Drawer>

      {/* Notification Snackbar */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.type === 'success' ? 'success' : 'error'} 
          sx={{ width: '100%', borderRadius: 2, boxShadow: 3 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default UserDashboard; 