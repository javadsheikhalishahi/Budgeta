import { colors, radius, spacingY } from '@/constants/theme';
import { Category, Goal, GoalFormData } from '@/type.js';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Icons from "phosphor-react-native";
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Currency types and constants
type Currency = 'USD' | 'GBP' | 'IRR' | 'EUR';

interface CurrencyOption {
  symbol: string;
  code: Currency;
  name: string;
}

const CURRENCIES: CurrencyOption[] = [
  { symbol: '$', code: 'USD', name: 'US Dollar' },
  { symbol: '£', code: 'GBP', name: 'British Pound' },
  { symbol: '﷼', code: 'IRR', name: 'Iranian Rial' },
  { symbol: '€', code: 'EUR', name: 'Euro' }
];

const STORAGE_KEYS = {
  GOALS: 'savings_goals',
  CURRENCY: 'selected_currency'
};

const GoalsSavingsTab: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState<boolean>(false);

  const [newGoal, setNewGoal] = useState<GoalFormData>({
    title: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    category: 'General',
    image: null
  });

  const formatNumberWithCommas = (value: string): string => {
    if (!value) return '';
    const numericValue = value.replace(/,/g, '');

    const parts = numericValue.split('.');
    let wholePart = parts[0];
    const decimalPart = parts[1] || '';
    
    // Add commas to whole number part
    wholePart = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Combine parts
    return decimalPart ? `${wholePart}.${decimalPart}` : wholePart;
  };

  const getCategoryIcon = (category: string) => {
    const getIconProps = (category: string) => {
      const primaryColor = getCategoryColor(category, true);
      return { size: 23, color: primaryColor, weight: "fill" as const };
    };
    
    switch (category) {
      case 'Housing':
        return <Icons.House {...getIconProps(category)} />;
      case 'Vehicle':
        return <Icons.Car {...getIconProps(category)} />;
      case 'Vacation':
        return <Icons.Airplane {...getIconProps(category)} />;
      case 'Education':
        return <Icons.GraduationCap {...getIconProps(category)} />;
      case 'Wedding':
        return <Icons.Heart {...getIconProps(category)} />;
      case 'Electronics':
        return <Icons.Laptop {...getIconProps(category)} />;
      case 'Emergency':
        return <Icons.FirstAid {...getIconProps(category)} />;
      case 'General':
        return <Icons.PiggyBank {...getIconProps(category)} />;
      default:
        return <Icons.Question {...getIconProps(category)} />;
    }
  };

  const categories: Category[] = [
    { label: 'Housing', value: 'Housing' },
    { label: 'Vehicle', value: 'Vehicle' },
    { label: 'Vacation', value: 'Vacation' },
    { label: 'Education', value: 'Education' },
    { label: 'Wedding', value: 'Wedding' },
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Emergency', value: 'Emergency' },
    { label: 'General', value: 'General' }
  ];

  // Load data from AsyncStorage on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Save goals whenever they change
  useEffect(() => {
    saveGoals();
  }, [goals]);

  const loadData = async () => {
    try {
      const [savedGoals, savedCurrency] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.GOALS),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENCY)
      ]);

      if (savedGoals) {
        setGoals(JSON.parse(savedGoals));
      }
      if (savedCurrency) {
        setSelectedCurrency(savedCurrency as Currency);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load saved data');
    }
  };

  const saveGoals = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  };

  const saveCurrency = async (currency: Currency) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENCY, currency);
    } catch (error) {
      console.error('Error saving currency:', error);
    }
  };

  const handleCurrencyChange = (currency: Currency) => {
    setSelectedCurrency(currency);
    saveCurrency(currency);
    setShowCurrencyDropdown(false);
  };

  // Enhanced Currency Formatting
  const formatCurrency = (amount: number): string => {
    const currency = CURRENCIES.find(c => c.code === selectedCurrency);
    if (!currency) return `$${amount.toLocaleString()}`;

    switch (currency.code) {
      case 'USD':
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'GBP':
        return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'IRR':
        // Iranian Rial typically doesn't use decimal places
        return `﷼${amount.toLocaleString('en-US')}`;
      case 'EUR':
        return `€${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      default:
        return `$${amount.toLocaleString()}`;
    }
  };

  const getCurrencySymbol = (): string => {
    return CURRENCIES.find(c => c.code === selectedCurrency)?.symbol || '$';
  };

  // Custom Date Picker Component
  const CustomDatePicker: React.FC<{ 
    visible: boolean; 
    onDateSelect: (date: string) => void; 
    onClose: () => void;
    selectedDate?: string;
  }> = ({ visible, onDateSelect, onClose, selectedDate }) => {
    const [currentDate, setCurrentDate] = useState(new Date(selectedDate || new Date()));
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];

    const getDaysInMonth = (month: number, year: number) => {
      return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
      return new Date(year, month, 1).getDay();
    };

    const generateCalendar = () => {
      const daysInMonth = getDaysInMonth(currentMonth, currentYear);
      const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
      const days = [];

      for (let i = 0; i < firstDay; i++) {
        days.push(null);
      }

      for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
      }

      return days;
    };

    const isSelectedDate = (day: number) => {
      return currentDate.getDate() === day && 
             currentDate.getMonth() === currentMonth && 
             currentDate.getFullYear() === currentYear;
    };

    const handleDateSelect = (day: number) => {
      const newDate = new Date(currentYear, currentMonth, day);
      setCurrentDate(newDate);
    };

    const handleConfirm = () => {
      const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      onDateSelect(formattedDate);
      onClose();
    };

    if (!visible) return null;

    return (
      <Modal transparent animationType="fade">
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Deadline</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.monthSelector}>
              <TouchableOpacity 
                onPress={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear(currentYear - 1);
                  } else {
                    setCurrentMonth(currentMonth - 1);
                  }
                }}
              >
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </TouchableOpacity>
              
              <Text style={styles.monthText}>
                {months[currentMonth]} {currentYear}
              </Text>
              
              <TouchableOpacity 
                onPress={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear(currentYear + 1);
                  } else {
                    setCurrentMonth(currentMonth + 1);
                  }
                }}
              >
                <Ionicons name="chevron-forward" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarGrid}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <Text key={index} style={styles.weekDay}>{day}</Text>
              ))}
              
              {generateCalendar().map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    day && isSelectedDate(day) ? styles.calendarDaySelected : null
                  ]}
                  onPress={() => day && handleDateSelect(day)}
                  disabled={!day}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      day && isSelectedDate(day) ? styles.calendarDayTextSelected : null
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.datePickerActions}>
              <TouchableOpacity style={styles.datePickerCancel} onPress={onClose}>
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.datePickerConfirm} onPress={handleConfirm}>
                <Text style={styles.datePickerConfirmText}>Select Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Progress Circle Component
  interface ProgressCircleProps {
    progress: number;
    size?: number;
    strokeWidth?: number;
    
  }

  const ProgressCircle: React.FC<ProgressCircleProps> = ({ 
    progress, 
    size = 60, 
    strokeWidth = 6 
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - progress * circumference;
    const progressColor = getProgressColor(progress);

    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              stroke="#333"
              fill="none"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
            />
            <Circle
              stroke={progressColor}
              fill="none"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: progressColor }}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      </View>
    );
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 1) return '#10B981';
    if (progress >= 0.75) return '#3B82F6';
    if (progress >= 0.5) return '#F59E0B';
    if (progress >= 0.25) return '#EF4444';
    return '#6B7280';
  };

  const calculateProgress = (current: number, target: number): number => {
    if (target === 0) return 0;
    return Math.min(current / target, 1);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const daysUntilDeadline = (deadline: string): number => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleAddGoal = (): void => {
    if (!newGoal.title || !newGoal.targetAmount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const goal: Goal = {
      id: editingGoal ? editingGoal.id : Date.now().toString(),
      title: newGoal.title,
      targetAmount: parseFloat(newGoal.targetAmount),
      currentAmount: parseFloat(newGoal.currentAmount) || 0,
      deadline: newGoal.deadline,
      category: newGoal.category,
      image: newGoal.image,
      createdAt: editingGoal ? editingGoal.createdAt : new Date()
    };

    if (editingGoal) {
      setGoals(goals.map(g => g.id === editingGoal.id ? goal : g));
    } else {
      setGoals([...goals, goal]);
    }

    setModalVisible(false);
    resetForm();
  };

  const handleEditGoal = (goal: Goal): void => {
    setEditingGoal(goal);
    setNewGoal({
      title: goal.title,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline,
      category: goal.category,
      image: goal.image || null
    });
    setModalVisible(true);
  };

  const handleDeleteGoal = (goalId: string): void => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => setGoals(goals.filter(g => g.id !== goalId))
        }
      ]
    );
  };

  const resetForm = (): void => {
    setNewGoal({
      title: '',
      targetAmount: '',
      currentAmount: '',
      deadline: '',
      category: 'General',
      image: null
    });
    setEditingGoal(null);
  };

  const addToSavings = (goalId: string, amount: number): void => {
    setGoals(goals.map(goal => {
      if (goal.id === goalId) {
        const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
        return { ...goal, currentAmount: newAmount };
      }
      return goal;
    }));
  };

  const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const overallProgress = totalTarget > 0 ? totalSaved / totalTarget : 0;

  const getCategoryColor = (category: string, isSelected: boolean): string => {
    const colorMap: { [key: string]: { primary: string, light: string } } = {
      'Housing': { primary: '#10B981', light: 'rgba(16, 185, 129, 0.15)' },
      'Vehicle': { primary: '#3B82F6', light: 'rgba(59, 130, 246, 0.15)' },
      'Vacation': { primary: '#F59E0B', light: 'rgba(245, 158, 11, 0.15)' },
      'Education': { primary: '#4F46E5', light: 'rgba(79, 70, 229, 0.15)' },
      'Wedding': { primary: '#EC4899', light: 'rgba(236, 72, 153, 0.15)' },
      'Electronics': { primary: '#06B6D4', light: 'rgba(6, 182, 212, 0.15)' },
      'Emergency': { primary: '#EF4444', light: 'rgba(239, 68, 68, 0.15)' },
      'General': { primary: '#EAB308', light: 'rgba(234, 179, 8, 0.15)' },
    };
    
    const colors = colorMap[category] || { primary: '#8B5CF6', light: 'rgba(139, 92, 246, 0.15)' };
    return isSelected ? colors.primary : colors.light;
  };

  const getCategoryColor2 = (category: string, isSelected: boolean): string => {
    const colorMap: { [key: string]: { primary: string, light: string } } = {
      'Housing': { primary: '#10B981', light: 'rgba(16, 185, 129, 0.8)' },
      'Vehicle': { primary: '#3B82F6', light: 'rgba(59, 130, 246, 0.8)' },
      'Vacation': { primary: '#F59E0B', light: 'rgba(245, 158, 11, 0.8)' },
      'Education': { primary: '#4F46E5', light: 'rgba(79, 70, 229, 0.8)' },
      'Wedding': { primary: '#EC4899', light: 'rgba(236, 72, 153, 0.8)' },
      'Electronics': { primary: '#06B6D4', light: 'rgba(6, 182, 212, 0.8)' },
      'Emergency': { primary: '#EF4444', light: 'rgba(239, 68, 68, 0.8)' },
      'General': { primary: '#EAB308', light: 'rgba(234, 179, 8, 0.8)' },
    };
    
    const colors = colorMap[category] || { primary: '#8B5CF6', light: 'rgba(139, 92, 246, 0.8)' };
    return isSelected ? colors.primary : colors.light;
  };

  // Enhanced Image Picker Component
  const ImagePickerModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    onImageSelect: (uri: string) => void;
  }> = ({ visible, onClose, onImageSelect }) => {
    const handleGalleryPick = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        onImageSelect(result.assets[0].uri);
        onClose();
      }
    };

    const handleCameraPick = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera permissions to take photos!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        onImageSelect(result.assets[0].uri);
        onClose();
      }
    };

    if (!visible) return null;
    
    return (
      <Modal transparent animationType="slide">
        <View style={styles.imagePickerModalOverlay}>
          <View style={styles.imagePickerModal}>
            <View style={styles.imagePickerHeader}>
              <Text style={styles.imagePickerTitle}>Choose Image</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.imagePickerOptions}>
              <TouchableOpacity style={styles.imagePickerOption} onPress={handleCameraPick}>
                <Ionicons name="camera" size={32} color="#667eea" />
                <Text style={styles.imagePickerOptionText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.imagePickerOption} onPress={handleGalleryPick}>
                <Ionicons name="images" size={32} color="#667eea" />
                <Text style={styles.imagePickerOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Currency Dropdown Component
  const CurrencyDropdown: React.FC = () => {
    return (
      <View style={styles.currencyContainer}>
        <TouchableOpacity 
          style={styles.currencySelector}
          onPress={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
        >
          <Text style={styles.currencySelectorText}>
            {getCurrencySymbol()} {selectedCurrency}
          </Text>
          <Ionicons 
            name={showCurrencyDropdown ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#FFF" 
          />
        </TouchableOpacity>

        {showCurrencyDropdown && (
          <View style={styles.currencyDropdown}>
            {CURRENCIES.map((currency) => (
              <TouchableOpacity
                key={currency.code}
                style={[
                  styles.currencyOption,
                  selectedCurrency === currency.code && styles.currencyOptionSelected
                ]}
                onPress={() => handleCurrencyChange(currency.code)}
              >
                <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                <View style={styles.currencyInfo}>
                  <Text style={styles.currencyCode}>{currency.code}</Text>
                  <Text style={styles.currencyName}>{currency.name}</Text>
                </View>
                {selectedCurrency === currency.code && (
                  <Ionicons name="checkmark" size={16} color="#667eea" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // User Guide Component
  const UserGuide: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
    if (!visible) return null;

    const steps = [
      { 
        icon: '🎯', 
        title: 'Set Financial Goals', 
        text: 'Create personalized savings targets with deadlines and categories',
        gradient: ['#FF6B6B', '#FF8E53'] as const
      },
      { 
        icon: '💰', 
        title: 'Multi-Currency Support', 
        text: 'Track goals in USD, GBP, Rial with real-time formatting',
        gradient: ['#4ECDC4', '#44A08D'] as const
      },
      { 
        icon: '📸', 
        title: 'Visual Inspiration', 
        text: 'Add custom images to visualize and motivate your savings journey',
        gradient: ['#FFD93D', '#FF9C33'] as const
      },
      { 
        icon: '📊', 
        title: 'Progress Tracking', 
        text: 'Beautiful circular progress indicators with color-coded status',
        gradient: ['#6BC5FF', '#3B82F6'] as const
      },
      { 
        icon: '⚡', 
        title: 'Quick Actions', 
        text: 'One-tap savings with smart amount suggestions',
        gradient: ['#A78BFA', '#7C3AED'] as const
      },
      { 
        icon: '🎨', 
        title: 'Smart Organization', 
        text: 'Categorize goals with colors and intuitive management',
        gradient: ['#F471B5', '#DB2777'] as const
      } 
    ];
  
    const [currentStep, setCurrentStep] = useState(0);
  
    const nextStep = () => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    };
  
    const prevStep = () => {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
    };
  
    return (
      <Modal transparent animationType="fade" statusBarTranslucent>
        <View style={styles.guideOverlay}>
          {/* Background Elements */}
          <View style={styles.backgroundElements}>
            <View style={[styles.floatingCircle, styles.floatingCircle1]} />
            <View style={[styles.floatingCircle, styles.floatingCircle2]} />
            <View style={[styles.floatingCircle, styles.floatingCircle3]} />
          </View>
  
          <View style={styles.guideContainer}>
            {/* Header */}
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.guideHeader}
            >
              <View style={styles.headerContent}>
                <View style={styles.titleSection}>
                  <Text style={styles.guidePreTitle}>WELCOME TO</Text>
                  <Text style={styles.guideTitle}>Goals & Savings</Text>
                  <Text style={styles.guideSubtitle}>Your financial journey starts here</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.guideCloseButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
              
              {/* Progress Dots */}
              <View style={styles.progressContainer}>
                {steps.map((_, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.progressDot,
                      index === currentStep && styles.progressDotActive,
                      index < currentStep && styles.progressDotCompleted
                    ]}
                  />
                ))}
              </View>
            </LinearGradient>
  
            {/* Content */}
            <View style={styles.guideContent}>
              <View style={styles.stepContainer}>
                <LinearGradient
                  colors={steps[currentStep].gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.stepIconContainer}
                >
                  <Text style={styles.stepIcon}>{steps[currentStep].icon}</Text>
                </LinearGradient>
                
                <View style={styles.stepTextContent}>
                  <Text style={styles.stepNumber}>Step {currentStep + 1} of {steps.length}</Text>
                  <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
                  <Text style={styles.stepDescription}>{steps[currentStep].text}</Text>
                </View>
              </View>
  
              {/* Feature Preview */}
              <View style={styles.featurePreview}>
                <View style={styles.previewCard}>
                  <View style={styles.previewHeader}>
                    <View style={styles.previewProgress}>
                      <View style={styles.previewProgressBar} />
                    </View>
                  </View>
                  <View style={styles.previewContent}>
                    <View style={styles.previewRow}>
                      <View style={styles.previewDot} />
                      <View style={styles.previewText} />
                    </View>
                    <View style={[styles.previewRow, styles.previewRowShort]} />
                  </View>
                </View>
              </View>
            </View>
  
            {/* Navigation */}
            <View style={styles.navigation}>
              <TouchableOpacity 
                style={[
                  styles.navButton,
                  styles.navButtonSecondary,
                  currentStep === 0 && styles.navButtonDisabled
                ]}
                onPress={prevStep}
                disabled={currentStep === 0}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={20} 
                  color={currentStep === 0 ? '#666' : '#667eea'} 
                />
                <Text style={[
                  styles.navButtonText,
                  styles.navButtonTextSecondary,
                  currentStep === 0 && styles.navButtonTextDisabled
                ]}>
                  Previous
                </Text>
              </TouchableOpacity>
  
              {currentStep < steps.length - 1 ? (
                <TouchableOpacity 
                  style={styles.navButton}
                  onPress={nextStep}
                >
                  <Text style={styles.navButtonText}>Next</Text>
                  <Ionicons name="chevron-forward" size={20} color="#FFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.getStartedButton}
                  onPress={onClose}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.getStartedGradient}
                  >
                    <Ionicons name="rocket" size={20} color="#FFF" />
                    <Text style={styles.getStartedText}>Get Started</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
  
            {/* Skip */}
            <TouchableOpacity style={styles.skipButton} onPress={onClose}>
              <Text style={styles.skipText}>Skip Tutorial</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const [showImagePicker, setShowImagePicker] = useState(false);

 
  const getProgressMessage = (progressRatio: number) => {
    if (progressRatio >= 1) return "Goal achieved! 🎉";
    if (progressRatio >= 0.75) return "Almost there! 🔥";
    if (progressRatio >= 0.5) return "Great progress! 💪";
    if (progressRatio >= 0.25) return "Keep going! 🚀";
    return "Every step counts! 🌟";
  };
  
  const getProgressInsights = (current: number, target: number): string => {
    const remaining = target - current;
    const progress = (current / target) * 100;
    
    if (remaining <= 0) return "Congratulations! You've successfully reached your financial goal. Consider setting a new target to continue your savings journey.";
    
    if (progress < 25) return `You're just starting your journey! The first steps are the most important. Keep consistent and watch your savings grow.`;
    if (progress < 50) return `Great momentum! You're building solid savings habits. Consider increasing your monthly contributions to reach your goal faster.`;
    if (progress < 75) return `Impressive progress! You're over halfway there. Stay focused and you'll reach your target before you know it.`;
    return `You're in the final stretch! So close to achieving your goal. Maintain your current pace and celebrate your discipline.`;
  };

  const getEstimatedCompletion = (currentAmount: string, targetAmount: string, deadline: string): string => {
    const current = parseFloat(currentAmount);
    const target = parseFloat(targetAmount);
    const remaining = target - current;
    
    if (remaining <= 0) return "Goal completed! 🎉";
    
    // Calculate daily savings needed based on deadline
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) return "Deadline passed ⏰";
    
    const dailyNeeded = remaining / daysRemaining;
    
    if (dailyNeeded > 1000) {
      return `Save  ${getCurrencySymbol()}${Math.ceil(dailyNeeded).toLocaleString()}/day`;
    } else if (dailyNeeded > 100) {
      return `Save  ${getCurrencySymbol()}${Math.ceil(dailyNeeded)}/day`;
    } else {
      return `Save  ${getCurrencySymbol()}${Math.ceil(dailyNeeded * 10) / 10}/day`;
    }
  };

  return (
    <View style={styles.container}>
  {/* Ultimate Premium Header */}
  <View style={styles.header}>
    {/* Animated Background */}
    <View style={styles.backgroundAnimation}>
      <View style={[styles.floatingShape, styles.floatingShape1]} />
      <View style={[styles.floatingShape, styles.floatingShape2]} />
      <View style={[styles.floatingShape, styles.floatingShape3]} />

      <LinearGradient
        colors={['rgba(102, 126, 234, 0.3)', 'rgba(118, 75, 162, 0.2)', 'transparent']}
        style={styles.backgroundGradient}
      />
    </View>

    <View style={styles.headerContent2}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back</Text>
          <View style={styles.dateContainer}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          </View>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowGuide(true)}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="sparkles" size={18} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mainActionButton}
            onPress={() => setModalVisible(true)}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53', '#FF6B6B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mainActionGradient}
            >
              <Ionicons name="add" size={16} color="white" />
              <Text style={styles.mainActionText}>New Goal</Text>
              <View style={styles.actionButtonGlow} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Title Section */}
      <View style={styles.titleSection1}>
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>Financial Goals</Text>
          <View style={styles.titleDecoration}>
            <View style={styles.titleLine} />
            <Ionicons name="diamond" size={16} color={colors.yellow}/>
            <View style={styles.titleLine} />
          </View>
          <Text style={styles.subtitle}>Your journey to financial freedom</Text>
        </View>
        
        <View style={styles.achievementBadge}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.badgeGradient}
          >
            <Ionicons name="trophy" size={16} color="#FFF" />
            <Text style={styles.badgeText}>{goals.length} Active</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Enhanced Stats Dashboard */}
      <View style={styles.statsDashboard}>
        {/* Saved Amount Card */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.statCardGradient}
          >
            <View style={styles.statHeader}>
              <View style={styles.statIconContainer}>
                <Ionicons name="wallet" size={20} color="#10B981" />
              </View>
              <View style={styles.statTrend}>
                <Ionicons name="trending-up" size={15} color="#10B981" />
                <Text style={styles.trendText}>Saved</Text>
              </View>
            </View>
            <Text style={styles.statAmount}>{formatCurrency(totalSaved)}</Text>
            <Text style={styles.statLabel}>Total Saved</Text>
            <View style={styles.statProgress}>
              <View style={[styles.statProgressBar, { width: `${Math.min((totalSaved / Math.max(totalTarget, 1)) * 100, 100)}%` }]} />
            </View>
          </LinearGradient>
        </View>

        {/* Progress Centerpiece */}
        <View style={styles.progressCenterpiece}>
          <View style={styles.progressOrb}>
            
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressPercentage}></Text>
              <ProgressCircle progress={overallProgress} size={90} strokeWidth={10} />
              <Text style={styles.progressLabel}>Complete</Text>
            </View>
          </View>
          <View style={styles.progressRingGlow} />
        </View>

        {/* Target Amount Card */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.statCardGradient}
          >
            <View style={styles.statHeader}>
              <View style={styles.statIconContainer}>
                <Icons.Target size={20} color="#3B82F6" />
              </View>
              <View style={styles.statTrend}>
                <Ionicons name="star" size={15} color="#3B82F6" />
                <Text style={styles.trendText}>Target</Text>
              </View>
            </View>
            <Text style={styles.statAmount}>{formatCurrency(totalTarget)}</Text>
            <Text style={styles.statLabel}>Total Target</Text>
            <View style={styles.statProgress}>
              <View style={[styles.statProgressBar, { width: '100%', backgroundColor: 'rgba(59, 130, 246, 0.6)' }]} />
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Quick Stats Row */}
      <View style={styles.quickStats}>
        <View style={styles.quickStat}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.quickStatText}>
            {goals.filter(g => g.currentAmount >= g.targetAmount).length} Completed
          </Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStat}>
          <Ionicons name="time" size={14} color="#F59E0B" />
          <Text style={styles.quickStatText}>
            {goals.filter(g => daysUntilDeadline(g.deadline) < 7 && g.currentAmount < g.targetAmount).length} Urgent
          </Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStat}>
          <Ionicons name="calendar" size={14} color="#667eea" />
          <Text style={styles.quickStatText}>
            {goals.length} Total Goals
          </Text>
        </View>
      </View>
    </View>
  </View>


      {/* Goals List */}
      <ScrollView 
  style={styles.goalsList} 
  showsVerticalScrollIndicator={false}
  contentContainerStyle={styles.goalsListContent}
>
  {goals.length === 0 ? (
    <View style={styles.emptyState}>
      {/* Empty State with Animation */}
      <View style={styles.emptyStateHero}>
        <View style={styles.floatingOrbs}>
          <View style={[styles.floatingOrb, styles.orb1]} />
          <View style={[styles.floatingOrb, styles.orb2]} />
          <View style={[styles.floatingOrb, styles.orb3]} />
        </View>
        
        <LinearGradient
          colors={['rgba(102, 126, 234, 0.15)', 'rgba(118, 75, 162, 0.08)']}
          style={styles.heroIllustration}
        >
          <View style={styles.illustrationContainer}>
            <Ionicons name="trending-up" size={50} color="#667eea" style={styles.illustrationIcon} />
            <View style={styles.illustrationParticles}>
              <View style={[styles.particle, styles.particle1]} />
              <View style={[styles.particle, styles.particle2]} />
              <View style={[styles.particle, styles.particle3]} />
            </View>
          </View>
        </LinearGradient>
        
        <View style={styles.heroGlow} />
      </View>

      <View style={styles.emptyStateContent}>
        <Text style={styles.emptyStateTitle}>Begin Your Wealth Journey</Text>
        <Text style={styles.emptyStateSubtitle}>
          Transform your financial dreams into achievable goals
        </Text>
        
        <View style={styles.emptyStateStats}>
          <View style={styles.statPreview}>
            <Ionicons name="bar-chart" size={20} color="#667eea" />
            <Text style={styles.statPreviewText}>Visual Progress Tracking</Text>
          </View>
          <View style={styles.statPreview}>
            <Ionicons name="calendar" size={20} color="#764ba2" />
            <Text style={styles.statPreviewText}>Smart Deadline Management</Text>
          </View>
          <View style={styles.statPreview}>
            <Ionicons name="rocket" size={20} color="#FF6B6B" />
            <Text style={styles.statPreviewText}>Quick Savings Actions</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2', '#667eea']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <View style={styles.ctaContent}>
              <Ionicons name="sparkles" size={22} color="#FFF" />
              <View style={styles.ctaTextContainer}>
                <Text style={styles.ctaMainText}>Create First Goal</Text>
                <Text style={styles.ctaSubText}>Start building your future</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </View>
            <View style={styles.ctaShine} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  ) : (
    <View style={styles.goalsContainer}>
      {/* Premium Goals Grid */}
      <View style={styles.goalsGrid}>
        {goals.map((goal, index) => {
          const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
          const daysLeft = daysUntilDeadline(goal.deadline);
          const isCompleted = progress >= 1;
          const isUrgent = daysLeft <= 7 && !isCompleted;
          const isAlmostThere = progress >= 0.8 && !isCompleted;
          
          return (
            <View key={goal.id} style={styles.goalCardWrapper}>
              <TouchableOpacity 
                style={[
                  styles.goalCard,
                  isCompleted && styles.goalCardCompleted,
                  isUrgent && styles.goalCardUrgent,
                  isAlmostThere && styles.goalCardAlmostThere
                ]}
                onPress={() => handleEditGoal(goal)}
                activeOpacity={0.9}
              >
                {/* Card Background */}
                <LinearGradient
                  colors={isCompleted ? 
                    ['rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.04)'] :
                    isUrgent ?
                    ['rgba(245, 158, 11, 0.08)', 'rgba(245, 158, 11, 0.02)'] :
                    ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']
                  }
                  style={styles.cardBackground}
                />

                {/* Goal Image */}
                {goal.image && (
                  <View style={styles.goalImageContainer}>
                    <Image source={{ uri: goal.image }} style={styles.goalImage} />
                    <LinearGradient
                      colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.6)']}
                      style={styles.imageOverlay}
                    />
                    
                    {/* Status Ribbon */}
                    {isCompleted && (
                      <View style={[styles.statusRibbon, styles.ribbonCompleted]}>
                        <Ionicons name="trophy" size={14} color="#FFF" />
                        <Text style={styles.ribbonText}>Achieved!</Text>
                      </View>
                    )}
                    {isUrgent && (
                      <View style={[styles.statusRibbon, styles.ribbonUrgent]}>
                        <Ionicons name="flash" size={14} color="#FFF" />
                        <Text style={styles.ribbonText}>Urgent</Text>
                      </View>
                    )}
                    {isAlmostThere && (
                      <View style={[styles.statusRibbon, styles.ribbonAlmostThere]}>
                        <Ionicons name="star" size={14} color="#FFF" />
                        <Text style={styles.ribbonText}>Almost There!</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Goal Content */}
                <View style={styles.goalContent}>
                  {/* Header Section */}
                  <View style={styles.goalHeader}>
                    <View style={styles.titleSection2}>
                      <Text style={styles.goalTitle} numberOfLines={2}>{goal.title}</Text>
                      <View style={styles.goalMeta}>
                      <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(goal.category, false) }]}>
  <View style={styles.categoryContent}>
    <View style={styles.categoryIconWrapper}>
      {getCategoryIcon(goal.category)}
    </View>
    <Text style={styles.categoryText}>{goal.category}</Text>
  </View>
</View>
                        <View style={styles.deadlineIndicator}>
                          <Ionicons 
                            name={daysLeft <= 0 ? "warning" : "calendar-outline"} 
                            size={16} 
                            color={daysLeft <= 0 ? "#EF4444" : (isUrgent ? "#F59E0B" : "#6B7280")} 
                          />
                          <Text style={[
                            styles.deadlineCount,
                            daysLeft <= 0 && styles.deadlineOverdue,
                            isUrgent && styles.deadlineUrgent
                          ]}>
                            {daysLeft > 0 ? `${daysLeft}d` : 'Overdue'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.actionMenu}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteGoal(goal.id);
                      }}
                    >
                      <View
                        style={styles.actionMenuGradient}
                      >
                        <Ionicons name="trash" size={22} color={colors.red} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Progress Section */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressVisual}>
                      <View style={styles.progressCircleContainer}>
                        <ProgressCircle progress={progress} size={85} strokeWidth={9} />
                        <View style={styles.progressCenter}>
                          <Text style={styles.progressPercent}></Text>
                          {isCompleted && (
                            <Ionicons name="checkmark" size={16} color="#10B981" />
                          )}
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.progressDetails}>
                      <View style={styles.amountDisplay}>
                        <Text style={styles.currentAmount}>{formatCurrency(goal.currentAmount)}</Text>
                        <Text style={styles.amountSeparator}>/</Text>
                        <Text style={styles.targetAmount}>{formatCurrency(goal.targetAmount)}</Text>
                      </View>
                      
                      <View style={styles.progressBarEnhanced}>
                        <View style={styles.progressBarTrack}>
                          <View 
                            style={[
                              styles.progressBarFill,
                              { width: `${progress * 100}%` }
                            ]} 
                          />
                          <View style={styles.progressBarGlow} />
                        </View>
                        <View style={styles.progressMilestones}>
                          <View style={styles.milestone} />
                          <View style={styles.milestone} />
                          <View style={styles.milestone} />
                        </View>
                      </View>
                      
                      <View style={styles.dateInfo}>
                        <Text style={styles.deadlineFullDate}>
                          Due: {formatDate(goal.deadline)}
                        </Text>
                        {isUrgent && (
                          <View style={styles.urgencyDot} />
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Quick Actions */}
                  <View style={styles.quickActionsEnhanced}>
                    <Text style={styles.quickActionsLabel}>Quick Save</Text>
                    <View style={styles.quickActionsRow}>
                      {[100, 50, 25].map((amount) => (
                        <TouchableOpacity 
                          key={amount}
                          style={styles.quickActionButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            addToSavings(goal.id, amount);
                          }}
                          activeOpacity={0.8}
                        >
                 <LinearGradient
  colors={['rgba(139, 92, 246, 0.3)', 'rgba(79, 70, 229, 0.6)']}
  style={styles.quickActionGradient}
>
                           
                            <Text style={styles.quickActionAmount}>{getCurrencySymbol()}{amount}</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Card Shine Effect */}
                <View style={styles.cardShine} />
              </TouchableOpacity>

              {/* Achievement Badge for Completed Goals */}
              {isCompleted && (
                <View style={styles.achievementBadge2}>
                  <Ionicons name="trophy" size={14} color="#F59E0B" />
                  <Text style={styles.achievementText}>Goal Achieved!</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  )}
</ScrollView>

      {/* Add/Edit Goal Modal with Currency Dropdown */}
      <Modal 
  animationType="slide"
  transparent={true}
  visible={modalVisible}
  onRequestClose={() => {
    setModalVisible(false);
    resetForm();
  }}
  statusBarTranslucent={true}
>
  <View style={styles.modalContainer}>
    {/* Enhanced Backdrop with Press to Close */}
    <TouchableWithoutFeedback onPress={() => {
      setModalVisible(false);
      resetForm();
    }}>
      <View style={styles.modalBackdrop} />
    </TouchableWithoutFeedback>
    
    {/* Main Content with Enhanced Interactions */}
    <View style={styles.modalContent}>
      {/* Enhanced Header with Better Visual Hierarchy */}
      <View style={styles.modalHeader}>
        <View style={styles.modalHeaderContent}>
          {/* Improved Drag Handle */}
          <View style={styles.modalDragContainer}>
            <View style={styles.modalDragHandle} />
          </View>
          
          {/* Enhanced Title Section */}
          <View style={styles.modalTitleSection}>
            <Text style={styles.modalTitle}>
              {editingGoal ? 'Edit Goal' : 'Create New Goal'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {editingGoal ? 'Update your savings target' : 'What are you saving for?'}
            </Text>
          </View>
          
          {/* Enhanced Close Button */}
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => {
              setModalVisible(false);
              resetForm();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Scroll with Better Feedback */}
      <ScrollView 
        style={styles.modalScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.modalScrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={true}
      >
                {/* Enhanced Customization Section */}
                <View style={styles.modalSection}>
          <View style={styles.modalSectionHeader}>
            <View style={styles.modalSectionIconContainer}>
              <Ionicons name="color-palette" size={26} color="#8B5CF6" />
            </View>
            <View style={styles.modalSectionTextContainer}>
              <Text style={styles.modalSectionTitle}>Customization</Text>
              <Text style={styles.modalSectionDescription}>Personalize your goal</Text>
            </View>
          </View>

          {/* Enhanced Currency Selection */}
          <View style={styles.modalField}>
            <View style={styles.modalFieldHeader}>
              <Text style={styles.modalFieldLabel}>Currency</Text>
            </View>
            <View style={styles.modalCurrencyContainer}>
              <CurrencyDropdown />
            </View>
          </View>

          {/* Enhanced Category Selection */}
          <View style={styles.modalField}>
  <View style={styles.modalFieldHeader}>
    <View style={styles.modalFieldLabelContainer}>
      <Text style={styles.modalFieldLabel}>Category</Text>
      <View style={styles.modalFieldBadge}>
        <Text style={styles.modalFieldBadgeText}>OPTIONAL</Text>
      </View>
    </View>
    <Text style={styles.modalFieldDescription}>
      Choose what you're saving for
    </Text>
  </View>
  
  <ScrollView 
    horizontal 
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.modalCategoriesContainer}
  >
    {categories.map((category, index) => (
      <TouchableOpacity
        key={category.value}
        style={[
          styles.modalCategoryChip,
          newGoal.category === category.value && styles.modalCategoryChipSelected,
          index === 0 && styles.modalCategoryChipFirst,
          index === categories.length - 1 && styles.modalCategoryChipLast,
        ]}
        onPress={() => setNewGoal({...newGoal, category: category.value})}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={[
          styles.modalCategoryIcon,
          newGoal.category === category.value && styles.modalCategoryIconSelected,
          { backgroundColor: getCategoryColor(category.value, false) },
          newGoal.category === category.value && { backgroundColor: colors.neutral200 }
        ]}>
          {getCategoryIcon(category.value)}
        </View>
        
        <Text style={[
          styles.modalCategoryText,
          newGoal.category === category.value && styles.modalCategoryTextSelected
        ]}>
          {category.label.replace(/[^a-zA-Z]/g, '')}
        </Text>
        
        {/* Selection Indicator */}
        {newGoal.category === category.value && (
          <View style={styles.modalCategoryCheckmark}>
            <Icons.Check size={16} color="#FFFFFF" weight="bold" />
          </View>
        )}
      </TouchableOpacity>
    ))}
  </ScrollView>
  
  {/* Selected Category Preview */}
  {newGoal.category && (
    <View style={[styles.modalCategoryPreview, { borderColor: getCategoryColor(newGoal.category, true) + '40' }]}>
      <View style={styles.modalCategoryPreviewContent}>
        <View style={[styles.modalCategoryPreviewIcon, { backgroundColor: getCategoryColor(newGoal.category, false) }]}>
          {getCategoryIcon(newGoal.category)}
        </View>
        <View style={styles.modalCategoryPreviewTextContainer}>
          <Text style={[styles.modalCategoryPreviewLabel, { color: getCategoryColor(newGoal.category, true) }]}>
            Selected category
          </Text>
          <Text style={styles.modalCategoryPreviewText}>
            {categories.find(c => c.value === newGoal.category)?.label}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.modalCategoryClear}
          onPress={() => setNewGoal({...newGoal, category: ''})}
        >
          <Icons.X size={16} color="#9CA3AF" weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  )}
</View>

          {/* Enhanced Image Upload */}
          <View style={styles.modalField}>
            <View style={styles.modalFieldHeader}>
              <Text style={styles.modalFieldLabel}>Goal Image</Text>
              <Text style={styles.modalFieldOptional}>(optional)</Text>
            </View>
            
            {newGoal.image ? (
              <View style={styles.modalImageContainer}>
                <Image 
                  source={{ uri: newGoal.image }} 
                  style={styles.modalImage} 
                />
                <View style={styles.modalImageActions}>
                  <TouchableOpacity 
                    style={styles.modalImageButton}
                    onPress={() => setShowImagePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={18} color="#FFF" />
                    <Text style={styles.modalImageButtonText}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalImageButton, styles.modalImageButtonRemove]}
                    onPress={() => setNewGoal({...newGoal, image: null})}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.modalImageUpload}
                onPress={() => setShowImagePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.modalImageUploadContent}>
                  <View style={styles.modalImageUploadIcon}>
                    <Ionicons name="add" size={28} color="#8B5CF6" />
                  </View>
                  <View style={styles.modalImageUploadText}>
                    <Text style={styles.modalImageUploadTitle}>Add Inspiration</Text>
                    <Text style={styles.modalImageUploadDescription}>
                      Choose an image that motivates you
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* Basic Information - Enhanced with Visual Feedback */}
        <View style={styles.modalSection}>
          <View style={styles.modalSectionHeader}>
            <View style={styles.modalSectionIconContainer}>
              <Ionicons name="rocket" size={24} color="#10B981" />
            </View>
            <View style={styles.modalSectionTextContainer}>
              <Text style={styles.modalSectionTitle}>Goal Details</Text>
              <Text style={styles.modalSectionDescription}>Tell us about your goal</Text>
            </View>
          </View>

          {/* Enhanced Goal Name Input */}
          <View style={styles.modalField}>
            <View style={styles.modalFieldHeader}>
              <Text style={styles.modalFieldLabel}>
                Goal Name <Text style={styles.modalRequired}>*</Text>
              </Text>
              <Text style={styles.modalFieldCounter}>
                {newGoal.title.length}/50
              </Text>
            </View>
            <TextInput
              style={[
                styles.modalInput,
                newGoal.title.length > 0 && styles.modalInputFilled
              ]}
              value={newGoal.title}
              onChangeText={(text) => setNewGoal({...newGoal, title: text})}
              placeholder="Dream vacation, New car, Emergency fund..."
              placeholderTextColor="#6B7280"
              maxLength={50}
              autoFocus={!editingGoal}
              returnKeyType="next"
            />
          </View>

          {/* Enhanced Date Picker */}
          <View style={styles.modalField}>
            <View style={styles.modalFieldHeader}>
              <Text style={styles.modalFieldLabel}>Target Date</Text>
              <Text style={styles.modalFieldOptional}>(optional)</Text>
            </View>
            <TouchableOpacity 
              style={styles.modalDatePicker}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.modalDateIcon}>
                <Ionicons name="calendar" size={20} color="#8B5CF6" />
              </View>
              <Text style={
                newGoal.deadline ? styles.modalDateText : styles.modalDatePlaceholder
              }>
                {newGoal.deadline ? formatDate(newGoal.deadline) : 'Set a target date'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Enhanced Amount Inputs with Better UX */}
          <View style={styles.modalAmountGrid}>
            <View style={styles.modalAmountCard}>
              <View style={styles.modalAmountHeader}>
                <View style={[styles.modalAmountIcon, styles.modalAmountIconTarget]}>
                  <Ionicons name="trending-up" size={22} color="#10B981" />
                </View>
                <Text style={styles.modalAmountLabel}>
                  Target Amount <Text style={styles.modalRequired}>*</Text>
                </Text>
              </View>
              <View style={[
                styles.modalAmountInput,
                newGoal.targetAmount.length > 0 && styles.modalAmountInputFilled
              ]}>
                <View style={styles.modalCurrencyPrefix}>
                  <Text style={styles.modalCurrencySymbol}>{getCurrencySymbol()}</Text>
                </View>
                <TextInput
  style={styles.modalAmountField}
  value={formatNumberWithCommas(newGoal.targetAmount)}
  onChangeText={(text) => {
    const numericText = text.replace(/[^\d.]/g, '');
    const cleanText = numericText.replace(/(\..*)\./g, '$1');
    setNewGoal({...newGoal, targetAmount: cleanText});
  }}
  placeholder="0.00"
  placeholderTextColor="#6B7280"
  keyboardType="decimal-pad"
  returnKeyType="next"
/>
              </View>
            </View>

            <View style={styles.modalAmountCard}>
              <View style={styles.modalAmountHeader}>
                <View style={[styles.modalAmountIcon, styles.modalAmountIconSaved]}>
                  <Ionicons name="wallet" size={22} color="#3B82F6" />
                </View>
                <Text style={styles.modalAmountLabel}>Already Saved</Text>
                
              </View>
              <View style={[
                styles.modalAmountInput,
                newGoal.currentAmount.length > 0 && styles.modalAmountInputFilled
              ]}>
                <View style={styles.modalCurrencyPrefix}>
                  <Text style={styles.modalCurrencySymbol}>{getCurrencySymbol()}</Text>
                </View>
                <TextInput
  style={styles.modalAmountField}
  value={formatNumberWithCommas(newGoal.currentAmount)}
  onChangeText={(text) => {
    const numericText = text.replace(/[^\d.]/g, '');
    const cleanText = numericText.replace(/(\..*)\./g, '$1');
    const parts = cleanText.split('.');
    let finalText = cleanText;
    if (parts.length > 1 && parts[1].length > 2) {
      finalText = `${parts[0]}.${parts[1].substring(0, 2)}`;
    }
    
    setNewGoal({...newGoal, currentAmount: finalText});
  }}
  placeholder="0.00"
  placeholderTextColor="#6B7280"
  keyboardType="decimal-pad"
/>
              </View>
            </View>
          </View>

          {/* Enhanced Progress Visualization */}
          {newGoal.targetAmount && newGoal.currentAmount && 
 parseFloat(newGoal.targetAmount) > 0 && parseFloat(newGoal.currentAmount) >= 0 && (
  <View style={styles.modalProgressCard}>
    {/* Subtle Background Effects */}
    <View style={styles.backgroundGlow} />
    <View style={styles.backgroundGlow2} />
    
    {/* Main Content */}
    <View style={styles.contentWrapper}>
      {/* Clean Header */}
      <View style={styles.modalProgressHeader}>
        <View style={styles.headerContentModal}>
          <View style={styles.titleSectionModal}>
            <Text style={styles.modalProgressTitle}>Savings Progress</Text>
            <Text style={styles.modalProgressSubtitle}>
              {getProgressMessage(parseFloat(newGoal.currentAmount) / parseFloat(newGoal.targetAmount))}
            </Text>
          </View>
          
          {/* Progress Circle */}
          <View style={styles.percentageContainer}>
            <View style={styles.circleProgress}>
              <View style={styles.circleBackground} />
              <View 
                style={[
                  styles.circleFill,
                  { 
                    transform: [
                      { rotate: `${(parseFloat(newGoal.currentAmount) / parseFloat(newGoal.targetAmount)) * 360}deg` }
                    ]
                  }
                ]} 
              />
              <View style={styles.circleInner}>
                <Text style={styles.modalPercentageText}>
                {Math.max((parseFloat(newGoal.currentAmount) / parseFloat(newGoal.targetAmount)) * 100, 0.01).toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Progress Bar Section */}
      <View style={styles.progressSection1}>
        <View style={styles.progressInfo}>
          <View style={styles.progressTexts}>
            <Text style={styles.progressLabel1}>PROGRESS</Text>
            <Text style={styles.progressAmount}>
              {getCurrencySymbol()}{parseFloat(newGoal.currentAmount).toLocaleString()} of {getCurrencySymbol()}{parseFloat(newGoal.targetAmount).toLocaleString()}
            </Text>
          </View>
        </View>
        
        {/* Clean Progress Bar */}
        <View style={styles.progressBar}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill1,
                { 
                  width: `${Math.min(
                    (parseFloat(newGoal.currentAmount) / parseFloat(newGoal.targetAmount)) * 100, 
                    100
                  )}%` 
                }
              ]}
            />
          </View>
        </View>
      </View>

      {/* Improved Stats Cards */}
      <View style={styles.statsDashboard1}>
  {/* Top Row - Two Cards */}
  <View style={styles.statRow}>
    <View style={styles.statCard1}>
      <View style={styles.statIconWrapper}>
        <Text style={styles.statIcon}><Icons.Wallet color="#10B981" size={35} weight="fill"/></Text>
      </View>
      <Text style={styles.statValue}>
        {getCurrencySymbol()}{parseFloat(newGoal.currentAmount).toLocaleString()}
      </Text>
      <Text style={styles.statLabel1}>Saved</Text>
    </View>

    <View style={styles.statCard1}>
      <View style={styles.statIconWrapper}>
        <Text style={styles.statIcon}><Icons.Target color="#3B82F6" size={35} /></Text>
      </View>
      <Text style={styles.statValue}>
        {getCurrencySymbol()}{parseFloat(newGoal.targetAmount).toLocaleString()}
      </Text>
      <Text style={styles.statLabel1}>Target</Text>
    </View>
  </View>

  {/* Bottom Row - Single Centered Card */}
  <View style={styles.statRowBottom}>
    <View style={styles.statCardWide}>
      <View style={styles.statIconWrapper}>
        <Text style={styles.statIcon}><Icons.Gauge color="#FACC15" size={35} /></Text>
      </View>
      <Text style={styles.statValue}>
        {getCurrencySymbol()}{(parseFloat(newGoal.targetAmount) - parseFloat(newGoal.currentAmount)).toLocaleString()}
      </Text>
      <Text style={styles.statLabel1}>Remaining</Text>
    </View>
  </View>
</View>

      {/* Simple Insights */}
      <View style={styles.insightsPanel}>
        <View style={styles.insightsHeader}>
          <Text style={styles.insightsIcon}><Icons.Lightbulb size={26} color='#FACC15' /></Text>
          <Text style={styles.insightsTitle}>Progress Update</Text>
        </View>
        
        <Text style={styles.insightsText}>
          {getProgressInsights(parseFloat(newGoal.currentAmount), parseFloat(newGoal.targetAmount))}
        </Text>
        
        <View style={styles.actionBar}>
  <View style={styles.actionCards}>
    {/* Daily Card */}
    <View style={[styles.actionCard, styles.dailyCard]}>
      <View style={styles.cardBackground} />
      <View style={styles.actionCardContent}>
        <View style={styles.actionCardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, styles.dailyIcon]}>
              <Icons.ArrowArcRight size={18} color="#10B981" weight="fill" />
            </View>
            <View>
              <Text style={styles.actionCardTitle}>Daily Target</Text>
              <Text style={styles.actionCardSubtitle}>To reach your goal</Text>
            </View>
          </View>
          <View style={[
  styles.badge, 
  styles.dailyBadge,
  !newGoal.deadline && styles.noDeadlineBadge,
  newGoal.deadline && (() => {
    const today = new Date();
    const deadlineDate = new Date(newGoal.deadline);
    const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining <= 0 && styles.expiredBadge;
  })()
]}>
  <Text style={[
    styles.badgeText1,
    !newGoal.deadline && styles.noDeadlineText,
    newGoal.deadline && (() => {
      const today = new Date();
      const deadlineDate = new Date(newGoal.deadline);
      const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysRemaining <= 0 && styles.expiredText;
    })()
  ]}>
    {(() => {
      if (!newGoal.deadline) return 'NO DEADLINE';
      
      const today = new Date();
      const deadlineDate = new Date(newGoal.deadline);
      const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 0) return 'EXPIRED';
      if (daysRemaining === 1) return '1 DAY';
      if (daysRemaining <= 30) return `${daysRemaining} DAYS`;
      if (daysRemaining <= 365) return `${Math.ceil(daysRemaining / 30)} MONTHS`;
      return `${Math.ceil(daysRemaining / 365)} YEARS`;
    })()}
  </Text>
</View>
        </View>
        <Text style={styles.actionCardValue}>
          {getCurrencySymbol()}{((parseFloat(newGoal.targetAmount) - parseFloat(newGoal.currentAmount)) / 30).toLocaleString(undefined,
            { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        
        {/* Progress Indicator */}
        <View style={styles.progressContainer3}>
  <View style={styles.progressBar3}>
    <View style={[
      styles.progressFill, 
      { 
        width: `${Math.min(
          (parseFloat(newGoal.currentAmount) / parseFloat(newGoal.targetAmount)) * 100, 
          100
        )}%` 
      }
    ]} />
  </View>
  <Text style={styles.progressText}>
    Monthly progress: {Math.round((parseFloat(newGoal.currentAmount) / parseFloat(newGoal.targetAmount)) * 100)}%
  </Text>
</View>
      </View>
    </View>

    {/* Estimate Card */}
    <View style={[styles.actionCard, styles.estimateCard]}>
      <View style={styles.cardBackground1} />
      <View style={styles.actionCardContent}>
        <View style={styles.actionCardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, styles.estimateIcon]}>
              <Icons.Calendar size={18} color="#8B5CF6" weight="fill" />
            </View>
            <View>
              <Text style={styles.actionCardTitle}>Completion</Text>
              <Text style={styles.actionCardSubtitle}>Based on deadline</Text>
            </View>
          </View>
          <View style={[styles.badge, styles.estimateBadge]}>
            <Icons.Clock size={18} color="#8B5CF6" />
          </View>
        </View>
        <Text style={styles.actionCardValue}>
          {getEstimatedCompletion(newGoal.currentAmount, newGoal.targetAmount, newGoal.deadline)}
        </Text>
        
        {/* Status Indicator */}
        <View style={styles.statusContainer}>
  <View style={styles.statusIndicator}>
    <View style={[
      styles.statusDot,
      (() => {
        if (!newGoal.deadline) return styles.statusNoDeadline;
        
        const today = new Date();
        const deadlineDate = new Date(newGoal.deadline);
        const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const progress = parseFloat(newGoal.currentAmount) / parseFloat(newGoal.targetAmount);
        const requiredDailyProgress = daysRemaining > 0 ? (1 - progress) / daysRemaining : 0;
        
        if (daysRemaining <= 0) return styles.statusExpired;
        if (requiredDailyProgress > 0.1) return styles.statusBehind; // More than 10% daily progress needed
        if (requiredDailyProgress > 0.05) return styles.statusAtRisk; // 5-10% daily progress needed
        return styles.statusOnTrack;
      })()
    ]} />
    <Text style={styles.statusText}>
      {(() => {
        if (!newGoal.deadline) return 'Set deadline';
        
        const today = new Date();
        const deadlineDate = new Date(newGoal.deadline);
        const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const progress = parseFloat(newGoal.currentAmount) / parseFloat(newGoal.targetAmount);
        const requiredDailyProgress = daysRemaining > 0 ? (1 - progress) / daysRemaining : 0;
        
        if (daysRemaining <= 0) return 'Time expired';
        if (requiredDailyProgress > 0.1) return 'Behind schedule';
        if (requiredDailyProgress > 0.05) return 'At risk';
        return 'On track';
      })()}
    </Text>
  </View>
  <Text style={styles.daysText}>
    {newGoal.deadline ? 
      (() => {
        const today = new Date();
        const deadlineDate = new Date(newGoal.deadline);
        const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysRemaining <= 0 ? 'Deadline passed' : `${daysRemaining} days remaining`;
      })() : 
      'No deadline set'
    }
  </Text>
</View>
      </View>
    </View>
  </View>
</View>
      </View>
    </View>
  </View>
)}
        </View>

        {/* Enhanced Help Section */}
        <View style={styles.modalHelpSection}>
          <View style={styles.modalHelpIcon}>
            <Ionicons name="bulb" size={20} color="#8B5CF6" />
          </View>
          <View style={styles.modalHelpContent}>
            <Text style={styles.modalHelpTitle}>Pro Tip</Text>
            <Text style={styles.modalHelpText}>
              Set realistic targets and celebrate small milestones along the way! 
              {!newGoal.deadline && " Adding a target date can help you stay motivated."}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Enhanced Action Bar with Better States */}
      <View style={styles.modalActions}>
        <View style={styles.modalActionContent}>
          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={() => {
              setModalVisible(false);
              resetForm();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.modalSaveButton,
              (!newGoal.title || !newGoal.targetAmount) 
                ? styles.modalSaveButtonDisabled 
                : styles.modalSaveButtonActive
            ]}
            onPress={handleAddGoal}
            disabled={!newGoal.title || !newGoal.targetAmount}
            activeOpacity={0.8}
          >
            <View style={styles.modalSaveContent}>
              <Ionicons 
                name={editingGoal ? "checkmark-circle" : "add-circle"} 
                size={20} 
                color="#FFF" 
              />
              <Text style={styles.modalSaveText}>
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </Text>
            </View>
            {(!newGoal.title || !newGoal.targetAmount) && (
              <View style={styles.modalSaveHint}>
                <Text style={styles.modalSaveHintText}>Complete required fields</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>

  {/* Keep existing modals */}
  <CustomDatePicker
    visible={showDatePicker}
    selectedDate={newGoal.deadline}
    onDateSelect={(date) => setNewGoal({...newGoal, deadline: date})}
    onClose={() => setShowDatePicker(false)}
  />

  <ImagePickerModal
    visible={showImagePicker}
    onClose={() => setShowImagePicker(false)}
    onImageSelect={(uri) => setNewGoal({...newGoal, image: uri})}
  />
</Modal>

      {/* User Guide */}
      <UserGuide visible={showGuide} onClose={() => setShowGuide(false)} />
    </View>
    
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    overflow: 'hidden',
    backgroundColor: colors.black,
    borderBottomWidth:1,
    borderBottomColor: colors.neutral500,
    borderRightWidth:1,
    borderLeftWidth:1,
  },
  backgroundAnimation: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingShape: {
    position: 'absolute',
    borderRadius: 500,
    opacity: 0.1,
  },
  floatingShape1: {
    width: 200,
    height: 200,
    backgroundColor: '#667eea',
    top: -80,
    right: -50,
    transform: [{ rotate: '45deg' }],
  },
  floatingShape2: {
    width: 150,
    height: 150,
    backgroundColor: '#764ba2',
    bottom: -60,
    left: -30,
    transform: [{ rotate: '-30deg' }],
  },
  floatingShape3: {
    width: 100,
    height: 100,
    backgroundColor: '#FF6B6B',
    top: '30%',
    right: '20%',
    transform: [{ rotate: '15deg' }],
  },
  floatingShape4: {
    width: 80,
    height: 80,
    backgroundColor: '#4ECDC4',
    bottom: '20%',
    left: '15%',
    transform: [{ rotate: '-15deg' }],
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent2: {
    paddingHorizontal: 25,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonGradient: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mainActionButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  mainActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    position: 'relative',
  },
  mainActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  actionButtonGlow: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  titleSection1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  titleContainer: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -1,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  titleDecoration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  achievementBadge: {
    borderRadius: 16,
    overflow: 'hidden',
    marginLeft: 15,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  statsDashboard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 50,
  },
  statCardGradient: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  statAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statProgress: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  statProgressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  progressCenterpiece: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    position: 'relative',
  },
  progressOrb: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  progressTextContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.7,
  },
  progressRingGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'transparent',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  quickStatText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  quickStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  // Currency Styles
  currencyContainer: {
    position: 'relative',
    zIndex: 9999,
    marginBottom: 5,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 12,
    minWidth: 120,
  },
  currencySelectorText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  currencyDropdown: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1001,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  currencyOptionSelected: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  currencySymbol: {
    fontSize: 18,
    color: '#FFF',
    marginRight: 12,
    width: 20,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  currencyName: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  goalsList: {
    flex: 1,
    backgroundColor: colors.black,
    
  },
  goalsListContent: {
    flexGrow: 1,
  },
  // Ultimate Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyStateHero: {
    position: 'relative',
    marginBottom: 50,
  },
  floatingOrbs: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingOrb: {
    position: 'absolute',
    borderRadius: 500,
    opacity: 0.1,
  },
  orb1: {
    width: 120,
    height: 120,
    backgroundColor: '#667eea',
    top: -20,
    left: -20,
  },
  orb2: {
    width: 80,
    height: 80,
    backgroundColor: '#764ba2',
    bottom: -10,
    right: -10,
  },
  orb3: {
    width: 60,
    height: 60,
    backgroundColor: '#FF6B6B',
    top: '40%',
    right: '30%',
  },
  heroIllustration: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.3)',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  illustrationContainer: {
    position: 'relative',
  },
  illustrationIcon: {
    zIndex: 2,
  },
  illustrationParticles: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#667eea',
  },
  particle1: {
    top: 10,
    right: 20,
  },
  particle2: {
    bottom: 15,
    left: 25,
  },
  particle3: {
    top: 40,
    left: 15,
  },
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    top: -20,
    left: -20,
  },
  emptyStateContent: {
    alignItems: 'center',
    width: '100%',
  },
  emptyStateTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  emptyStateSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
    fontWeight: '500',
  },
  emptyStateStats: {
    gap: 16,
    marginBottom: 50,
    width: '100%',
  },
  statPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statPreviewText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  ctaButton: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  ctaGradient: {
    padding: 24,
    borderRadius: 28,
    position: 'relative',
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaTextContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  ctaMainText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  ctaSubText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  ctaShine: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  // Goals Container
  goalsContainer: {
    padding: 20,
    paddingBottom:80,
  },
  goalsSummary: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  goalsGrid: {
    gap: 20,
  },
  goalCardWrapper: {
    position: 'relative',
  },
  goalCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
  },
  goalCardCompleted: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  goalCardUrgent: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  goalCardAlmostThere: {
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  goalImageContainer: {
    position: 'relative',
    height: 180,
  },
  goalImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  statusRibbon: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ribbonCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
  },
  ribbonUrgent: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  ribbonAlmostThere: {
    backgroundColor: 'rgba(102, 126, 234, 0.9)',
  },
  ribbonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  goalContent: {
    padding: 24,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleSection2: {
    flex: 1,
    marginRight: 16,
  },
  goalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  goalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconWrapper: {
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.6,
  },
  deadlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  deadlineCount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  deadlineOverdue: {
    color: '#EF4444',
  },
  deadlineUrgent: {
    color: '#F59E0B',
  },
  actionMenu: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionMenuGradient: {
    width: 45,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressVisual: {
    marginRight: 20,
  },
  progressCircleContainer: {
    position: 'relative',
  },
  progressCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  progressDetails: {
    flex: 1,
  },
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    gap: 6,
  },
  currentAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  amountSeparator: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  targetAmount: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  progressBarEnhanced: {
    marginBottom: 2,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  progressBarGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderRadius: 4,
  },
  progressMilestones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  milestone: {
    width: 2,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deadlineFullDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  quickActionsEnhanced: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.09)',
    paddingTop: 7,
  },
  quickActionsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickActionSymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 2,
  },
  quickActionAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    transform: [{ translateX: 30 }, { translateY: -30 }],
  },
  achievementBadge2: {
    position: 'absolute',
    top: -8,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  achievementText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
    minHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },

  // Enhanced Header
  modalHeader: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  modalDragContainer: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: [{ translateX: -20 }],
  },
  modalDragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#374151',
    borderRadius: 3,
  },
  modalTitleSection: {
    flex: 1,
    marginTop: spacingY._15,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 0,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    lineHeight: 22,
  },
  modalCloseButton: {
    width: 20,
    height: 65,
    borderRadius: 22,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    
  },

  // Scroll Content
  modalScrollView: {
    flex: 1,
    backgroundColor: colors.black,
  },
  modalScrollContent: {
    padding: 24,
    paddingBottom: 8,
  },

  // Enhanced Sections
  modalSection: {
    backgroundColor: '#111822',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalSectionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalSectionTextContainer: {
    flex: 1,
  },
  modalSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  modalSectionDescription: {
    fontSize: 15,
    color: '#9CA3AF',
    lineHeight: 20,
  },

  // Enhanced Fields
  modalField: {
    marginBottom: 28,
  },
  modalFieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalFieldLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  modalRequired: {
    color: '#EF4444',
  },
  modalFieldCounter: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalFieldOptional: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
    marginLeft: 6,
  },
  modalInput: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    fontSize: 17,
    color: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#1F2937',
    fontWeight: '500',
  },
  modalInputFilled: {
    borderColor: '#374151',
    backgroundColor: '#1A1F2E',
  },

  // Enhanced Amount Grid
  modalAmountGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  modalAmountCard: {
    flex: 1,
  },
  modalAmountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  modalAmountIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalAmountIconTarget: {
    backgroundColor: '#064E3B',
  },
  modalAmountIconSaved: {
    backgroundColor: '#1E3A8A',
  },
  modalAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
    marginRight: 6,
  },
  modalAmountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1F2937',
    overflow: 'hidden',
  },
  modalAmountInputFilled: {
    borderColor: '#374151',
    backgroundColor: '#1A1F2E',
  },
  modalCurrencyPrefix: {
    paddingHorizontal: 14,
    paddingVertical: 18,
    backgroundColor: '#111827',
    borderRightWidth: 1,
    borderRightColor: '#374151',
  },
  modalCurrencySymbol: {
    color: '#E5E7EB',
    fontSize: 18,
    fontWeight: '600',

  },
  modalAmountField: {
    flex: 1,
    padding: 13,
    fontSize: 16,
    color: '#F9FAFB',
    fontWeight: '700',
    backgroundColor: 'transparent',
  },

  // Enhanced Progress
  modalProgressCard: {
    backgroundColor: '#1A1F3E',
    borderRadius: 24,
    padding: 0,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  backgroundGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 120,
    height: 120,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 60,
  },
  backgroundGlow2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 100,
    height: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 50,
  },
  contentWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  modalProgressHeader: {
    padding: 24,
    paddingBottom: 20,
  },
  headerContentModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSectionModal: {
    flex: 1,
    marginRight: 16,
  },
  modalProgressTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalProgressSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    lineHeight: 20,
  },
  percentageContainer: {
    alignItems: 'center',
  },
  circleProgress: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circleBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  circleFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 40,
    borderWidth: 3,
    borderLeftColor: '#10B981',
    borderTopColor: '#10B981',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  circleInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(26, 31, 62, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalPercentageText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#10B981',
  },
  progressSection1: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 20,
  },
  progressInfo: {
    marginBottom: 16,
  },
  progressTexts: {
    flex: 1,
  },
  progressLabel1: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  progressAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressBar: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  progressBarFill1: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 8,
  },
  statsDashboard1: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12, // Add space between rows
  },
  statRowBottom: {
    flexDirection: 'row',
    justifyContent: 'center', // Center the single card
  },
  statCard1: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius._15,
    padding: 5,
    paddingVertical: spacingY._5,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statCardWide: {
    width: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius._15,
    padding: 5,
    paddingVertical: spacingY._5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 18,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel1: {
    fontSize: 11,
    color: colors.neutral500,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.1
  },
  insightsPanel: {
    margin: 20,
    marginTop: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightsIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  insightsTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  insightsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionBar: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
  },
  actionCards: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  dailyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  estimateCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  cardBackground1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  actionCardContent: {
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 2,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dailyIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  estimateIcon: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  actionCardTitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  noDeadlineBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  expiredBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  noDeadlineText: {
    color: '#F59E0B',
  },
  expiredText: {
    color: '#EF4444',
  },
  estimateBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  badgeText1: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionCardValue: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'left',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressContainer3: {
    width: '100%',
  },
  progressBar3: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusOnTrack: {
    backgroundColor: '#10B981',
  },
  statusAtRisk: {
    backgroundColor: '#F59E0B',
  },
  statusBehind: {
    backgroundColor: '#EF4444',
  },
  statusExpired: {
    backgroundColor: '#DC2626',
  },
  statusNoDeadline: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  daysText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  actionCardDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dividerOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Enhanced Currency
  modalCurrencyContainer: {
    borderRadius: 16,
    overflow: 'visible',
  },

  // Enhanced Date Picker
  modalDatePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  modalDateIcon: {
    marginRight: 16,
  },
  modalDateText: {
    flex: 1,
    fontSize: 17,
    color: '#F9FAFB',
    fontWeight: '500',
  },
  modalDatePlaceholder: {
    flex: 1,
    fontSize: 17,
    color: '#6B7280',
  },

  // Enhanced Categories
 
  modalFieldLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
 
  modalFieldBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    paddingLeft: 5,
    marginLeft: 7
  },
  modalFieldBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 0.5,
  },
  modalFieldDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    paddingRight: 4
  },
  modalCategoriesContainer: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 12,
  },
  modalCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 56,
    position: 'relative',
  },
  modalCategoryChipSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    
  },
  modalCategoryChipFirst: {
    marginLeft: 2,
  },
  modalCategoryChipLast: {
    marginRight: 2,
  },
  modalCategoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCategoryIconSelected: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalCategoryText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: 8,
  },
  modalCategoryTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalCategoryCheckmark: {
    width: 23,
    height: 23,
    borderRadius: 50,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  modalCategoryPreview: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  modalCategoryPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalCategoryPreviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  modalCategoryPreviewTextContainer: {
    flex: 1,
  },
  modalCategoryPreviewLabel: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 2,
  },
  modalCategoryPreviewText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCategoryClear: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Enhanced Image Upload
  modalImageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalImage: {
    width: '100%',
    height: 160,
  },
  modalImageActions: {
    flexDirection: 'row',
    gap: 16,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modalImageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  },
  modalImageButtonRemove: {
    flex: 0,
    padding: 14,
    backgroundColor: '#DC2626',
  },
  modalImageButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalImageUpload: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#374151',
    borderStyle: 'dashed',
  },
  modalImageUploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  modalImageUploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E1B4B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#3730A3',
  },
  modalImageUploadText: {
    flex: 1,
  },
  modalImageUploadTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 4,
  },
  modalImageUploadDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 18,
  },

  // Enhanced Help Section
  modalHelpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#3730A3',
  },
  modalHelpIcon: {
    marginTop: 2,
  },
  modalHelpContent: {
    flex: 1,
  },
  modalHelpTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#A5B4FC',
    marginBottom: 6,
  },
  modalHelpText: {
    fontSize: 14,
    color: '#C7D2FE',
    lineHeight: 20,
  },

  // Enhanced Actions
  modalActions: {
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 28,
  },
  modalActionContent: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  modalCancelButton: {
    flex: 1,
    padding: 18,
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalCancelText: {
    fontSize: 17,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalSaveButtonActive: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#374151',
  },
  modalSaveContent: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  modalSaveText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalSaveHint: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
  },
  modalSaveHintText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Date Picker Styles (unchanged)
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  weekDay: {
    width: '14.28%',
    textAlign: 'center',
    padding: 10,
    fontWeight: '600',
    color: '#666',
  },
  calendarDay: {
    width: '14.28%',
    alignItems: 'center',
    padding: 10,
    marginVertical: 2,
  },
  calendarDaySelected: {
    backgroundColor: '#667eea',
    borderRadius: 20,
  },
  calendarDayText: {
    color: '#FFF',
    fontWeight: '600',
  },
  calendarDayTextSelected: {
    color: '#FFF',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datePickerCancel: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#333',
    borderRadius: 10,
  },
  datePickerCancelText: {
    color: '#FFF',
    fontWeight: '600',
  },
  datePickerConfirm: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: '#667eea',
    borderRadius: 10,
  },
  datePickerConfirmText: {
    color: '#FFF',
    fontWeight: '600',
  },
  // Guide Styles (unchanged)
  guideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backgroundElements: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 500,
    opacity: 0.1,
  },
  floatingCircle1: {
    width: 200,
    height: 200,
    backgroundColor: '#667eea',
    top: -50,
    right: -50,
  },
  floatingCircle2: {
    width: 150,
    height: 150,
    backgroundColor: '#764ba2',
    bottom: -30,
    left: -30,
  },
  floatingCircle3: {
    width: 100,
    height: 100,
    backgroundColor: '#FF6B6B',
    top: '40%',
    right: '10%',
  },
  guideContainer: {
    backgroundColor: '#0A0A0A',
    borderRadius: 32,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 30,
    },
    shadowOpacity: 0.3,
    shadowRadius: 50,
    elevation: 30,
  },
  guideHeader: {
    paddingVertical: 32,
    paddingHorizontal: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleSection: {
    flex: 1,
  },
  guidePreTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  guideTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  guideSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400',
  },
  guideCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    
  },
  progressDotActive: {
    width: 24,
    backgroundColor: '#FFF',
  },
  progressDotCompleted: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  guideContent: {
    padding: 30,
  },
  stepContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  stepIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  stepIcon: {
    fontSize: 40,
  },
  stepTextContent: {
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 8,
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  stepDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  featurePreview: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  previewCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 16,
  },
  previewHeader: {
    marginBottom: 16,
  },
  previewProgress: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  previewProgressBar: {
    height: '100%',
    width: '65%',
    backgroundColor: '#667eea',
    borderRadius: 3,
  },
  previewContent: {
    gap: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewRowShort: {
    width: '70%',
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  previewText: {
    height: 8,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 24,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  navButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowOpacity: 0,
    elevation: 0,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextSecondary: {
    color: '#667eea',
  },
  navButtonTextDisabled: {
    color: '#666',
  },
  getStartedButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  getStartedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  getStartedText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  skipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  // Enhanced Image Picker Modal Styles (unchanged)
  imagePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  imagePickerModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  imagePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  imagePickerOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  imagePickerOption: {
    alignItems: 'center',
    padding: 20,
  },
  imagePickerOptionText: {
    color: '#FFF',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GoalsSavingsTab;