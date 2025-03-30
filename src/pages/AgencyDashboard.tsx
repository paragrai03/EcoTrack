import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Chip,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Divider,
  AppBar,
  Toolbar,
  useTheme,
  alpha,
  Tab,
  Tabs,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { db } from '../config/firebase';
import { collection, getDocs, addDoc, onSnapshot, where, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import AddIcon from '@mui/icons-material/Add';
import MapIcon from '@mui/icons-material/Map';
import PersonIcon from '@mui/icons-material/Person';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TimelineIcon from '@mui/icons-material/Timeline';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

interface Route {
  id: string;
  driverId: string;
  date: string;
  pickups: string[];
  status: string;
}

interface PickupRequest {
  id: string;
  userId: string;
  userEmail?: string;
  date: string;
  time: string;
  address: string;
  wasteType: string;
  status: string;
  driverId?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  location?: {
    lat: number;
    lng: number;
  };
}

interface AnalyticsData {
  date: string;
  pickups: number;
  completed: number;
}

interface WasteTypeData {
  wasteType: string;
  count: number;
}

const AgencyDashboard: React.FC = () => {
  const theme = useTheme();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [pickupRequests, setPickupRequests] = useState<PickupRequest[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [wasteTypeData, setWasteTypeData] = useState<WasteTypeData[]>([]);
  const [openDriverDialog, setOpenDriverDialog] = useState(false);
  const [openRouteDialog, setOpenRouteDialog] = useState(false);
  const [newDriver, setNewDriver] = useState<Partial<Driver>>({});
  const [newRoute, setNewRoute] = useState<Partial<Route>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{open: boolean, id: string, type: 'pickup' | 'driver' | 'route'}>({
    open: false,
    id: '',
    type: 'pickup'
  });
  const [feedbackMessage, setFeedbackMessage] = useState<{open: boolean, message: string, type: 'success' | 'error'}>({
    open: false,
    message: '',
    type: 'success'
  });

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    setIsLoading(true);
    // Subscribe to drivers collection
    const unsubscribeDrivers = onSnapshot(
      collection(db, 'drivers'),
      (snapshot) => {
        const driversData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Driver));
        setDrivers(driversData);
        setIsLoading(false);
      }
    );

    // Subscribe to routes collection
    const unsubscribeRoutes = onSnapshot(
      collection(db, 'routes'),
      (snapshot) => {
        const routesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Route));
        setRoutes(routesData);
      }
    );

    // Subscribe to pickup requests collection
    const unsubscribePickups = onSnapshot(
      collection(db, 'pickupRequests'),
      (snapshot) => {
        const pickupsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PickupRequest));
        
        setPickupRequests(pickupsData);
        
        // Process analytics data when pickup requests change
        const processedAnalytics = processAnalyticsData(pickupsData);
        setAnalyticsData(processedAnalytics);
        
        // Process waste type data
        const processedWasteTypeData = processWasteTypeData(pickupsData);
        setWasteTypeData(processedWasteTypeData);
      }
    );

    return () => {
      unsubscribeDrivers();
      unsubscribeRoutes();
      unsubscribePickups();
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const processAnalyticsData = (requests: PickupRequest[]): AnalyticsData[] => {
    const data: { [key: string]: AnalyticsData } = {};
    
    requests.forEach(request => {
      if (!request.createdAt) return;
      
      let dateString;
      try {
        // Handle both Timestamp and date strings
        if (typeof request.createdAt === 'object' && request.createdAt.toDate) {
          dateString = request.createdAt.toDate().toLocaleDateString();
        } else {
          dateString = new Date(request.createdAt as any).toLocaleDateString();
        }
      } catch (error) {
        console.error('Error processing date:', error);
        return;
      }
      
      if (!data[dateString]) {
        data[dateString] = { date: dateString, pickups: 0, completed: 0 };
      }
      
      data[dateString].pickups++;
      
      if (request.status === 'completed') {
        data[dateString].completed++;
      }
    });
    
    // Convert to array and sort by date
    return Object.values(data).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };
  
  const processWasteTypeData = (requests: PickupRequest[]): WasteTypeData[] => {
    const data: { [key: string]: number } = {};
    
    requests.forEach(request => {
      const wasteType = request.wasteType || 'Unknown';
      if (!data[wasteType]) {
        data[wasteType] = 0;
      }
      data[wasteType]++;
    });
    
    return Object.entries(data).map(([wasteType, count]) => ({
      wasteType,
      count
    }));
  };

  const handleAddDriver = async () => {
    if (newDriver.name && newDriver.email && newDriver.phone) {
      try {
        await addDoc(collection(db, 'drivers'), {
          ...newDriver,
          status: 'available',
          createdAt: new Date(),
        });
        setOpenDriverDialog(false);
        setNewDriver({});
      } catch (error) {
        console.error('Error adding driver:', error);
      }
    }
  };

  const handleAddRoute = async () => {
    if (newRoute.driverId && newRoute.date) {
      try {
        await addDoc(collection(db, 'routes'), {
          ...newRoute,
          status: 'scheduled',
          pickups: [],
          createdAt: new Date(),
        });
        setOpenRouteDialog(false);
        setNewRoute({});
      } catch (error) {
        console.error('Error adding route:', error);
      }
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Get counts of pickups by status
  const pendingPickups = pickupRequests.filter(p => p.status === 'pending').length;
  const acceptedPickups = pickupRequests.filter(p => p.status === 'accepted').length;
  const completedPickups = pickupRequests.filter(p => p.status === 'completed').length;
  const totalPickups = pickupRequests.length;

  // Dashboard sections based on tab value
  const renderDashboardContent = () => {
    switch(activeTab) {
      case 0: // Main Dashboard
        return renderMainDashboard();
      case 1: // Pickup Requests
        return renderPickupRequests();
      case 2: // Drivers
        return renderDrivers();
      case 3: // Routes
        return renderRoutes();
      default:
        return renderMainDashboard();
    }
  };

  const renderMainDashboard = () => (
    <>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: 2, 
              boxShadow: 3,
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 6,
              }
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ mb: 2, p: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: '50%' }}>
                <DashboardIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
              </Box>
              <Typography variant="h5" color="primary" fontWeight="bold" sx={{ mt: 1 }}>{totalPickups}</Typography>
              <Typography variant="subtitle1" color="text.secondary">Total Pickups</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: 2, 
              boxShadow: 3,
              transition: 'transform 0.3s, box-shadow 0.3s',
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
              <Typography variant="h5" color="info.main" fontWeight="bold" sx={{ mt: 1 }}>{pendingPickups}</Typography>
              <Typography variant="subtitle1" color="text.secondary">Pending Pickups</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: 2, 
              boxShadow: 3,
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 6,
              }
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ mb: 2, p: 1, bgcolor: alpha(theme.palette.secondary.main, 0.1), borderRadius: '50%' }}>
                <LocalShippingIcon sx={{ fontSize: 40, color: theme.palette.secondary.main }} />
              </Box>
              <Typography variant="h5" color="secondary.main" fontWeight="bold" sx={{ mt: 1 }}>{acceptedPickups}</Typography>
              <Typography variant="subtitle1" color="text.secondary">In Progress</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: 2, 
              boxShadow: 3,
              transition: 'transform 0.3s, box-shadow 0.3s',
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
              <Typography variant="h5" color="success.main" fontWeight="bold" sx={{ mt: 1 }}>{completedPickups}</Typography>
              <Typography variant="subtitle1" color="text.secondary">Completed Pickups</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Analytics Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 2, boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Pickup Analytics by Date
                </Typography>
                <IconButton size="small" onClick={handleRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {refreshing ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          borderRadius: 8,
                          boxShadow: '0 4px 8px rgba(0,0,0,0.15)', 
                          border: 'none' 
                        }} 
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="pickups" 
                        stroke={theme.palette.primary.main} 
                        strokeWidth={2}
                        name="Total Pickups" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="completed" 
                        stroke={theme.palette.success.main} 
                        strokeWidth={2}
                        name="Completed" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Waste Type Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Waste Type Distribution
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wasteTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="wasteType"
                      label={({ wasteType, percent }) => `${wasteType}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {wasteTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [value, props.payload.wasteType]}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        borderRadius: 8,
                        boxShadow: '0 4px 8px rgba(0,0,0,0.15)', 
                        border: 'none' 
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );

  const renderPickupRequests = () => (
    <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Recent Pickup Requests
          </Typography>
          <IconButton size="small" onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Address</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Waste Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Driver</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {refreshing ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : pickupRequests.length > 0 ? (
                pickupRequests
                  .sort((a, b) => {
                    // Sort by created date, newest first
                    if (a.createdAt && b.createdAt) {
                      return b.createdAt.seconds - a.createdAt.seconds;
                    }
                    return 0;
                  })
                  .map((pickup) => (
                    <TableRow key={pickup.id} hover>
                      <TableCell>{pickup.date} {pickup.time}</TableCell>
                      <TableCell>{pickup.userEmail || pickup.userId}</TableCell>
                      <TableCell>{pickup.address}</TableCell>
                      <TableCell>{pickup.wasteType}</TableCell>
                      <TableCell>
                        {pickup.driverId ? 
                          drivers.find(d => d.id === pickup.driverId)?.name || pickup.driverId 
                          : 'Not assigned'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={pickup.status} 
                          color={
                            pickup.status === 'completed' ? 'success' :
                            pickup.status === 'accepted' ? 'secondary' : 'primary'
                          }
                          sx={{ fontWeight: 'medium' }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="primary">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDeleteClick(pickup.id, 'pickup')}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                    No pickup requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const renderDrivers = () => (
    <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Drivers Management
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setOpenDriverDialog(true)}
            sx={{ 
              borderRadius: 8,
              textTransform: 'none',
              px: 3,
              py: 1,
              fontWeight: 'bold'
            }}
          >
            Add Driver
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {refreshing ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : drivers.length > 0 ? (
                drivers.map((driver) => (
                  <TableRow key={driver.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 2, p: 0.5, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: '50%' }}>
                          <PersonIcon sx={{ color: theme.palette.primary.main }} />
                        </Box>
                        {driver.name}
                      </Box>
                    </TableCell>
                    <TableCell>{driver.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={driver.status} 
                        color={driver.status === 'available' ? 'success' : 'default'}
                        sx={{ fontWeight: 'medium' }}
                      />
                    </TableCell>
                    <TableCell>{driver.phone}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleDeleteClick(driver.id, 'driver')}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    No drivers available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const renderRoutes = () => (
    <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Routes Management
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setOpenRouteDialog(true)}
            sx={{ 
              borderRadius: 8,
              textTransform: 'none',
              px: 3,
              py: 1,
              fontWeight: 'bold'
            }}
          >
            Add Route
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Driver</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Pickups</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {refreshing ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : routes.length > 0 ? (
                routes.map((route) => (
                  <TableRow key={route.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 2, p: 0.5, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: '50%' }}>
                          <PersonIcon sx={{ color: theme.palette.primary.main }} />
                        </Box>
                        {drivers.find(d => d.id === route.driverId)?.name || 'Unknown driver'}
                      </Box>
                    </TableCell>
                    <TableCell>{route.date}</TableCell>
                    <TableCell>
                      <Chip 
                        label={route.status} 
                        color={
                          route.status === 'completed' ? 'success' :
                          route.status === 'in progress' ? 'secondary' : 'primary'
                        }
                        sx={{ fontWeight: 'medium' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${route.pickups.length} pickups`} 
                        color="info"
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleDeleteClick(route.id, 'route')}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    No routes available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const handleDeleteClick = (id: string, type: 'pickup' | 'driver' | 'route') => {
    setDeleteConfirmation({
      open: true,
      id,
      type
    });
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation({
      open: false,
      id: '',
      type: 'pickup'
    });
  };

  const handleConfirmDelete = async () => {
    const { id, type } = deleteConfirmation;
    
    try {
      if (type === 'pickup') {
        // Simply delete the pickup request
        await deleteDoc(doc(db, 'pickupRequests', id));
        
        // If this pickup is part of any routes, update those routes
        const routesToUpdate = routes.filter(route => route.pickups.includes(id));
        for (const route of routesToUpdate) {
          const updatedPickups = route.pickups.filter(pickupId => pickupId !== id);
          await updateDoc(doc(db, 'routes', route.id), {
            pickups: updatedPickups
          });
        }
      } else if (type === 'driver') {
        // Check if driver has any assigned routes
        const driverRoutes = routes.filter(route => route.driverId === id);
        
        if (driverRoutes.length > 0) {
          // Option 1: Delete the driver and all associated routes
          await deleteDoc(doc(db, 'drivers', id));
          
          // Delete all routes associated with this driver
          for (const route of driverRoutes) {
            await deleteDoc(doc(db, 'routes', route.id));
          }
          
          // Option 2 (alternative): Unassign the driver from routes instead of deleting them
          // for (const route of driverRoutes) {
          //   await updateDoc(doc(db, 'routes', route.id), {
          //     driverId: 'unassigned'
          //   });
          // }
        } else {
          // No routes assigned, can safely delete
          await deleteDoc(doc(db, 'drivers', id));
        }
        
        // Update any pickup requests assigned to this driver
        const pickupsToUpdate = pickupRequests.filter(pickup => pickup.driverId === id);
        for (const pickup of pickupsToUpdate) {
          await updateDoc(doc(db, 'pickupRequests', pickup.id), {
            driverId: null,
            status: 'pending' // Reset status to pending since driver is removed
          });
        }
      } else if (type === 'route') {
        // Simply delete the route
        await deleteDoc(doc(db, 'routes', id));
        
        // Option: Also update the status of pickups that were part of this route
        const routeData = routes.find(r => r.id === id);
        if (routeData && routeData.pickups.length > 0) {
          for (const pickupId of routeData.pickups) {
            // Update pickup status back to pending since route is deleted
            await updateDoc(doc(db, 'pickupRequests', pickupId), {
              status: 'pending'
            });
          }
        }
      }
      
      // Close the confirmation dialog
      setDeleteConfirmation({
        open: false,
        id: '',
        type: 'pickup'
      });
      
      // Show success message
      setFeedbackMessage({
        open: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`,
        type: 'success'
      });
      
      // Show refresh animation
      handleRefresh();
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      
      // Show error message
      setFeedbackMessage({
        open: true,
        message: `Error deleting ${type}. Please try again.`,
        type: 'error'
      });
    }
  };

  const handleCloseFeedback = () => {
    setFeedbackMessage({
      ...feedbackMessage,
      open: false
    });
  };

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
            <DashboardIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
            <Typography variant="h5" color="primary" fontWeight="bold">
              Agency Dashboard
            </Typography>
          </Box>
          
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            <Button 
              variant="contained" 
              sx={{ 
                ml: 2, 
                borderRadius: 8,
                textTransform: 'none',
                fontWeight: 'bold'
              }}
            >
              Generate Report
            </Button>
          </Box>
        </Toolbar>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          centered
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              minHeight: 48
            },
            '& .Mui-selected': {
              color: theme.palette.primary.main
            }
          }}
        >
          <Tab 
            icon={<DashboardIcon />} 
            iconPosition="start" 
            label="Dashboard" 
          />
          <Tab 
            icon={<ReceiptIcon />} 
            iconPosition="start" 
            label="Pickup Requests" 
          />
          <Tab 
            icon={<PersonIcon />} 
            iconPosition="start" 
            label="Drivers" 
          />
          <Tab 
            icon={<MapIcon />} 
            iconPosition="start" 
            label="Routes" 
          />
        </Tabs>
      </AppBar>

      <Container maxWidth="xl" sx={{ mb: 4 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        ) : (
          renderDashboardContent()
        )}
      </Container>

      {/* Add Driver Dialog */}
      <Dialog 
        open={openDriverDialog} 
        onClose={() => setOpenDriverDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: 'white', fontWeight: 'bold' }}>
          Add New Driver
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={newDriver.name || ''}
            onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={newDriver.email || ''}
            onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Phone"
            fullWidth
            value={newDriver.phone || ''}
            onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setOpenDriverDialog(false)}
            variant="outlined"
            sx={{ 
              borderRadius: 8,
              textTransform: 'none',
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddDriver} 
            variant="contained"
            sx={{ 
              borderRadius: 8,
              textTransform: 'none',
              px: 3
            }}
          >
            Add Driver
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Route Dialog */}
      <Dialog 
        open={openRouteDialog} 
        onClose={() => setOpenRouteDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: 'white', fontWeight: 'bold' }}>
          Add New Route
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            select
            margin="dense"
            label="Driver"
            fullWidth
            value={newRoute.driverId || ''}
            onChange={(e) => setNewRoute({ ...newRoute, driverId: e.target.value })}
            sx={{ mb: 2 }}
          >
            {drivers.map((driver) => (
              <MenuItem key={driver.id} value={driver.id}>
                {driver.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            margin="dense"
            label="Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={newRoute.date || ''}
            onChange={(e) => setNewRoute({ ...newRoute, date: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setOpenRouteDialog(false)}
            variant="outlined"
            sx={{ 
              borderRadius: 8,
              textTransform: 'none',
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddRoute} 
            variant="contained"
            sx={{ 
              borderRadius: 8,
              textTransform: 'none',
              px: 3
            }}
          >
            Add Route
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmation.open}
        onClose={handleCancelDelete}
      >
        <DialogTitle>
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {deleteConfirmation.type}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelDelete}
            variant="outlined"
            sx={{ 
              borderRadius: 8,
              textTransform: 'none',
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            sx={{ 
              borderRadius: 8,
              textTransform: 'none',
              px: 3
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar
        open={feedbackMessage.open}
        autoHideDuration={4000}
        onClose={handleCloseFeedback}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseFeedback} 
          severity={feedbackMessage.type}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {feedbackMessage.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AgencyDashboard; 