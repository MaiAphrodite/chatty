"use client";

import {
  ArrowDownExtraSmallIcon as StashArrowDownExtraSmallIcon,
  ChartIcon as StashChartIcon,
  CheckSmallIcon as StashCheckSmallIcon,
  ChevronRightIcon as StashChevronRightIcon,
  ChevronUpDownIcon as StashChevronUpDownIcon,
  CodeIcon as StashCodeIcon,
  DotsHorizontalIcon as StashDotsHorizontalIcon,
  EditIcon as StashEditIcon,
  EyeIcon as StashEyeIcon,
  EyeOffIcon as StashEyeOffIcon,
  PackageIcon as StashPackageIcon,
  PlusIcon as StashPlusIcon,
  Settings2Icon as StashSettings2Icon,
  StreamIcon as StashStreamIcon,
  Trash2Icon as StashTrash2Icon,
  UploadIcon as StashUploadIcon,
  XSmallIcon as StashXSmallIcon,
} from "stashicons-react/base";

function iconSize(size: number) {
  return { width: size, height: size };
}

export function HomeIcon({ size = 24 }: { size?: number }) {
  return <StashCodeIcon style={iconSize(size)} />;
}

export function SettingsIcon({ size = 24 }: { size?: number }) {
  return <StashSettings2Icon style={iconSize(size)} />;
}

export function HamburgerIcon({ size = 24 }: { size?: number }) {
  return <StashStreamIcon style={iconSize(size)} />;
}

export function HashtagIcon() {
  return <StashChartIcon style={iconSize(20)} />;
}

export function DotsIcon({ size = 20 }: { size?: number }) {
  return <StashDotsHorizontalIcon style={iconSize(size)} />;
}

export function ChevronDownIcon() {
  return <StashArrowDownExtraSmallIcon style={iconSize(12)} />;
}

export function PlusIcon({ size = 20 }: { size?: number }) {
  return <StashPlusIcon style={iconSize(size)} />;
}

export function EditIcon({ size = 16 }: { size?: number }) {
  return <StashEditIcon style={iconSize(size)} />;
}

export function TrashIcon({ size = 16 }: { size?: number }) {
  return <StashTrash2Icon style={iconSize(size)} />;
}

export function XIcon({ size = 20 }: { size?: number }) {
  return <StashXSmallIcon style={iconSize(size)} />;
}

export function GlobeIcon({ size = 12 }: { size?: number }) {
  return <StashEyeIcon style={iconSize(size)} />;
}

export function LockIcon({ size = 12 }: { size?: number }) {
  return <StashEyeOffIcon style={iconSize(size)} />;
}

export function SlidersIcon({ size = 18 }: { size?: number }) {
  return <StashChevronUpDownIcon style={iconSize(size)} />;
}

export function RefreshCwIcon({ size = 16 }: { size?: number }) {
  return <StashUploadIcon style={iconSize(size)} />;
}

export function ContinueIcon({ size = 16 }: { size?: number }) {
  return <StashChevronRightIcon style={iconSize(size)} />;
}

export function BookmarkIcon({ size = 16 }: { size?: number }) {
  return <StashCheckSmallIcon style={iconSize(size)} />;
}

export function CheckIcon({ size = 16 }: { size?: number }) {
  return <StashCheckSmallIcon style={iconSize(size)} />;
}

export function DatabaseIcon({ size = 24 }: { size?: number }) {
  return <StashPackageIcon style={iconSize(size)} />;
}

export function MessagesSquareIcon({ size = 24 }: { size?: number }) {
  return <StashDotsHorizontalIcon style={iconSize(size)} />;
}
