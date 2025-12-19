/**
 * Icon system exports
 *
 * Usage:
 * import { LucideIcon, SkipBack30, ICON_SIZES } from '@/shared/components/icons';
 * import { Play, Pause, Moon } from 'lucide-react-native';
 *
 * <LucideIcon icon={Play} size="lg" color="accent" accessibilityLabel="Play" />
 * <SkipBack30 size={32} color="primary" />
 */

// Components
export { LucideIcon } from './LucideIcon';
export { SkipBack30 } from './SkipBack30';
export { SkipForward30 } from './SkipForward30';

// Constants
export {
  ICON_SIZES,
  ICON_STROKE_WIDTH,
  ICON_COLORS,
  MIN_TOUCH_TARGET,
  type IconSize,
  type IconColor,
} from './constants';

// Re-export commonly used Lucide icons for convenience
export {
  // Navigation
  Home,
  Library,
  Compass,
  Search,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  ArrowLeft,

  // Player
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,

  // Controls
  Moon,
  Clock,
  Gauge,
  List,
  ListOrdered,
  Bookmark,
  BookmarkCheck,
  Share2,
  MoreHorizontal,
  MoreVertical,

  // Library/Browse
  Download,
  Check,
  CheckCircle,
  Circle,
  CircleDot,
  Loader2,
  SlidersHorizontal,
  ArrowUpDown,
  Grid3X3,
  Heart,
  Plus,
  ListPlus,
  Trash2,

  // Book Details
  BookOpen,
  Mic,
  PenTool,
  BookCopy,
  Star,

  // Status
  AlertTriangle,
  Info,
  HelpCircle,
  WifiOff,
  CloudOff,

  // Settings
  HardDrive,
  Bell,
  Lock,
  Palette,
  LogOut,
} from 'lucide-react-native';
