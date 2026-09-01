import {
  Activity,
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  Banknote,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown as LucideChevronDown,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
  CircleCheck,
  CircleHelp,
  Clock as LucideClock,
  Ellipsis,
  Eye,
  EyeOff,
  Flag as LucideFlag,
  FlaskConical,
  FolderInput,
  Gauge as LucideGauge,
  Inbox,
  Info as LucideInfo,
  LayoutGrid,
  ListFilter,
  Lock,
  LogIn,
  LogOut,
  Mail as LucideMail,
  MapPin,
  Menu,
  Pencil,
  Pin as LucidePin,
  Plus,
  RefreshCw,
  Reply,
  Search as LucideSearch,
  Shield as LucideShield,
  Sparkles,
  Star as LucideStar,
  Tag as LucideTag,
  Timer as LucideTimer,
  Trash2,
  TriangleAlert,
  Undo2,
  UsersRound,
  UserX,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * The app's icon vocabulary, backed by lucide-react. Every icon keeps the
 * Fluent-like defaults the layouts were built around (20px, 1.5 stroke,
 * decorative by default) and takes `size` / `strokeWidth` / `className`
 * overrides like any lucide icon.
 */
type IconProps = Omit<LucideProps, "ref">;

function make(Icon: LucideIcon) {
  const Wrapped = ({ size = 20, strokeWidth = 1.5, absoluteStrokeWidth = true, ...rest }: IconProps) => (
    <Icon size={size} strokeWidth={strokeWidth} absoluteStrokeWidth={absoluteStrokeWidth} aria-hidden="true" focusable="false" {...rest} />
  );
  Wrapped.displayName = Icon.displayName ?? "Icon";
  return Wrapped;
}

/* Shell */
export const Search = make(LucideSearch);
export const LineHorizontal = make(Menu);
export const AppFolder = make(LayoutGrid);

/* Sections */
export const Mail = make(LucideMail);
export const MailInbox = make(Inbox);
export const Calendar = make(CalendarDays);
export const People = make(UsersRound);
export const Tag = make(LucideTag);
export const Gauge = make(LucideGauge);
export const EyeOpen = make(Eye);
export const EyeClosed = make(EyeOff);
export const Book = make(BookOpen);
export const Shield = make(LucideShield);
export const Pulse = make(Activity);
export const Beaker = make(FlaskConical);

/* Direction */
export const ChevronDown = make(LucideChevronDown);
export const ChevronRight = make(LucideChevronRight);
export const ChevronLeft = make(LucideChevronLeft);
export const ArrowRight = make(LucideArrowRight);
export const ArrowLeft = make(LucideArrowLeft);

/* Actions */
export const Add = make(Plus);
export const Delete = make(Trash2);
export const CheckmarkCircle = make(CircleCheck);
export const PersonProhibited = make(UserX);
export const ArrowSync = make(RefreshCw);
export const FolderArrowRight = make(FolderInput);
export const ArrowReply = make(Reply);
export const CheckmarkDouble = make(CheckCheck);
export const Flag = make(LucideFlag);
export const Pin = make(LucidePin);
export const Clock = make(LucideClock);
export const ArrowUndo = make(Undo2);
export const More = make(Ellipsis);
export const Filter = make(ListFilter);
export const Edit = make(Pencil);
export const SignOut = make(LogOut);
export const SignIn = make(LogIn);

/* Status & meta */
export const Location = make(MapPin);
export const LockClosed = make(Lock);
export const Star = make(LucideStar);
export const Checkmark = make(Check);
export const Dismiss = make(X);
export const Info = make(LucideInfo);
export const Warning = make(TriangleAlert);
export const QuestionCircle = make(CircleHelp);
export const Sparkle = make(Sparkles);
export const Money = make(Banknote);
export const Timer = make(LucideTimer);
