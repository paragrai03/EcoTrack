import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Box,
  Card,
  CardContent,
  IconButton,
  Divider,
  ListItemIcon,
  AppBar,
  Toolbar,
  useTheme,
  alpha,
  CircularProgress,
  Avatar,
  Badge,
} from '@mui/material';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';
import { db, auth } from '../config/firebase';
import { collection, query, where, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import DirectionsIcon from '@mui/icons-material/Directions';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import RefreshIcon from '@mui/icons-material/Refresh';
import NavigationIcon from '@mui/icons-material/Navigation';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';

interface PickupRequest {
  id: string;
  date: string;
  time: string;
  address: string;
  wasteType: string;
  status: string;
  userId: string;
  location: {
    lat: number;
    lng: number;
  };
}

const DriverDashboard: React.FC = () => {
  const theme = useTheme();
  const [pickupRequests, setPickupRequests] = useState<PickupRequest[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PickupRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load Google Maps API with proper error handling
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    // Add libraries if needed
    // libraries: ['places']
  });

  useEffect(() => {
    // Get driver's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          console.log("Driver location obtained:", position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }

    // Subscribe to ALL pickup requests that are pending or assigned to this driver
    const user = auth.currentUser;
    if (!user) return;

    console.log("Driver user ID:", user.uid);
    
    // Create a query for pending pickup requests
    const pendingQuery = query(
      collection(db, 'pickupRequests'), 
      where('status', '==', 'pending')
    );
    
    // Create a query for pickup requests assigned to this driver
    const assignedQuery = query(
      collection(db, 'pickupRequests'),
      where('driverId', '==', user.uid)
    );
    
    // Subscribe to pending requests
    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PickupRequest));
      
      console.log("Pending pickup requests:", requests);
      
      // Set the combined requests
      setPickupRequests(prevRequests => {
        // Filter out the pending requests from the previous state
        const nonPendingRequests = prevRequests.filter(req => req.status !== 'pending');
        // Combine with new pending requests
        return [...nonPendingRequests, ...requests];
      });
      setIsLoading(false);
    });
    
    // Subscribe to assigned requests
    const unsubscribeAssigned = onSnapshot(assignedQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PickupRequest));
      
      console.log("Assigned pickup requests:", requests);
      
      // Set the combined requests
      setPickupRequests(prevRequests => {
        // Filter out the assigned requests from the previous state
        const assignedIds = requests.map(req => req.id);
        const nonAssignedRequests = prevRequests.filter(req => 
          !assignedIds.includes(req.id) || req.status === 'pending'
        );
        // Combine with new assigned requests
        return [...nonAssignedRequests, ...requests];
      });
      setIsLoading(false);
    });

    return () => {
      unsubscribePending();
      unsubscribeAssigned();
    };
  }, []);

  const handleRequestSelect = (request: PickupRequest) => {
    setSelectedRequest(request);
    if (request.location) {
      calculateRoute(request.location);
    }
  };

  const handleAcceptPickup = async (request: PickupRequest) => {
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, 'pickupRequests', request.id), {
          status: 'accepted',
          driverId: user.uid,
        });
        setSelectedRequest(request);
        calculateRoute(request.location);
      } catch (error) {
        console.error('Error accepting pickup:', error);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const calculateRoute = async (destination: { lat: number; lng: number }) => {
    if (currentLocation && isLoaded && window.google) {
      const directionsService = new google.maps.DirectionsService();
      try {
        const result = await directionsService.route({
          origin: currentLocation,
          destination: destination,
          travelMode: google.maps.TravelMode.DRIVING,
        });
        setDirections(result);
      } catch (error) {
        console.error('Error calculating route:', error);
      }
    }
  };

  const handleCompletePickup = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'pickupRequests', requestId), {
        status: 'completed',
        completedAt: new Date(),
      });
      setSelectedRequest(null);
      setDirections(null);
    } catch (error) {
      console.error('Error completing pickup:', error);
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

  const pendingCount = pickupRequests.filter(r => r.status === 'pending').length;
  const acceptedCount = pickupRequests.filter(r => r.status === 'accepted').length;
  const completedCount = pickupRequests.filter(r => r.status === 'completed').length;

  return (
    <>
      <AppBar 
        position="static" 
        color="default" 
        elevation={0}
        sx={{ 
          bgcolor: 'white', 
          borderBottom: `1px solid ${theme.palette.divider}`,
          mb: 4
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LocalShippingIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
            <Typography variant="h5" color="primary" fontWeight="bold">
              Driver Dashboard
            </Typography>
          </Box>
          
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
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
            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
              <PersonIcon />
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Status Cards */}
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
                    <Box sx={{ mb: 2, p: 1, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: '50%' }}>
                      <PendingIcon sx={{ fontSize: 40, color: theme.palette.info.main }} />
                    </Box>
                    <Typography variant="h5" color="info.main" fontWeight="bold">{pendingCount}</Typography>
                    <Typography variant="subtitle1" color="text.secondary">Pending Pickups</Typography>
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
                    <Box sx={{ mb: 2, p: 1, bgcolor: alpha(theme.palette.secondary.main, 0.1), borderRadius: '50%' }}>
                      <DirectionsIcon sx={{ fontSize: 40, color: theme.palette.secondary.main }} />
                    </Box>
                    <Typography variant="h5" color="secondary.main" fontWeight="bold">{acceptedCount}</Typography>
                    <Typography variant="subtitle1" color="text.secondary">In Progress</Typography>
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
              {/* Map Section */}
              <Grid item xs={12} md={8}>
                <Card sx={{ borderRadius: 2, boxShadow: 3, height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <NavigationIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                        <Typography variant="h6" fontWeight="bold">
                          Live Navigation
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                setCurrentLocation({
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
                    <Box sx={{ height: 500, width: '100%', position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
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
                          center={currentLocation || defaultCenter}
                          zoom={13}
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
                          {currentLocation && (
                            <Marker 
                              position={currentLocation} 
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
                                onClick={() => handleRequestSelect(request)}
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
                          {directions && <DirectionsRenderer directions={directions} />}
                        </GoogleMap>
                      )}
                    </Box>

                    {selectedRequest && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          Active Pickup Details
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LocationOnIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                              <Typography variant="body2">{selectedRequest.address}</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <AccessTimeIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                              <Typography variant="body2">{selectedRequest.date} at {selectedRequest.time}</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              {selectedRequest.status === 'accepted' && (
                                <Button
                                  variant="contained"
                                  color="success"
                                  startIcon={<CheckCircleIcon />}
                                  onClick={() => handleCompletePickup(selectedRequest.id)}
                                  sx={{ 
                                    borderRadius: 8,
                                    textTransform: 'none',
                                    fontWeight: 'bold',
                                    px: 3
                                  }}
                                >
                                  Complete Pickup
                                </Button>
                              )}
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Pickup Requests List */}
              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 2, boxShadow: 3, height: '100%' }}>
                  <CardContent sx={{ p: 3, pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DeleteSweepIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                        <Typography variant="h6" fontWeight="bold">
                          Pickup Requests
                        </Typography>
                      </Box>
                      <Badge badgeContent={pendingCount} color="error" sx={{ mr: 1 }}>
                        <IconButton size="small" onClick={handleRefresh}>
                          <RefreshIcon />
                        </IconButton>
                      </Badge>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    
                    {refreshing ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                        <CircularProgress size={40} />
                      </Box>
                    ) : pickupRequests.length > 0 ? (
                      <List sx={{ maxHeight: 480, overflow: 'auto', pb: 0 }}>
                        {pickupRequests.map((request) => (
                          <ListItem 
                            key={request.id} 
                            sx={{ 
                              mb: 2, 
                              p: 0, 
                              borderRadius: 2,
                              overflow: 'hidden',
                              transition: 'transform 0.2s, box-shadow 0.2s',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: 2,
                              }
                            }}
                          >
                            <Card 
                              sx={{ 
                                width: '100%', 
                                boxShadow: selectedRequest?.id === request.id ? 3 : 1,
                                border: selectedRequest?.id === request.id ? `1px solid ${theme.palette.primary.main}` : 'none',
                              }}
                            >
                              <CardContent sx={{ p: 2, pb: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                  <ListItemIcon sx={{ minWidth: 'auto', mr: 1, mt: 0.5 }}>
                                    {request.status === 'pending' ? (
                                      <PendingIcon color="info" />
                                    ) : request.status === 'accepted' ? (
                                      <DirectionsIcon color="secondary" />
                                    ) : (
                                      <CheckCircleIcon color="success" />
                                    )}
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={
                                      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                                        {request.wasteType} Pickup
                                      </Typography>
                                    }
                                    secondary={
                                      <>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                          <LocationOnIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary', fontSize: 16 }} />
                                          <Typography variant="body2" color="text.secondary" noWrap>
                                            {request.address}
                                          </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary', fontSize: 16 }} />
                                          <Typography variant="body2" color="text.secondary">
                                            {request.date} at {request.time}
                                          </Typography>
                                        </Box>
                                      </>
                                    }
                                  />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                  {request.status === 'pending' ? (
                                    <Button
                                      variant="contained"
                                      color="primary"
                                      size="small"
                                      startIcon={<DirectionsIcon />}
                                      onClick={() => handleAcceptPickup(request)}
                                      sx={{ 
                                        borderRadius: 8,
                                        textTransform: 'none',
                                        fontWeight: 'bold',
                                        px: 2
                                      }}
                                    >
                                      Accept
                                    </Button>
                                  ) : request.status === 'accepted' && selectedRequest?.id === request.id ? (
                                    <Button
                                      variant="contained"
                                      color="success"
                                      size="small"
                                      startIcon={<CheckCircleIcon />}
                                      onClick={() => handleCompletePickup(request.id)}
                                      sx={{ 
                                        borderRadius: 8,
                                        textTransform: 'none',
                                        fontWeight: 'bold',
                                        px: 2
                                      }}
                                    >
                                      Complete
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      startIcon={<RestoreIcon />}
                                      onClick={() => handleRequestSelect(request)}
                                      sx={{ 
                                        borderRadius: 8,
                                        textTransform: 'none',
                                        px: 2
                                      }}
                                    >
                                      Details
                                    </Button>
                                  )}
                                </Box>
                              </CardContent>
                            </Card>
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                        <Typography variant="body1" color="text.secondary">
                          No pickup requests available
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </>
  );
};

export default DriverDashboard;