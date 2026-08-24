export type ReportStatus = "Pending" | "Verified" | "Rejected";
export type ReportCategory =
  | "Water Logging"
  | "Road Blocked"
  | "Structural Damage"
  | "Rescue Needed"
  | "Power Outage";

export type Report = {
  id: number;
  ward: string;
  category: ReportCategory;
  description: string;
  reporter: string;
  timeAgo: string;
  status: ReportStatus;
};

export function generateReports(): Report[] {
  return [
    {
      id: 1,
      ward: "Ward 14",
      category: "Structural Damage",
      description: "Retaining wall near the market showing visible cracks after overnight rain.",
      reporter: "Local Resident",
      timeAgo: "12 min ago",
      status: "Pending",
    },
    {
      id: 2,
      ward: "Ward 9",
      category: "Water Logging",
      description: "Main road submerged, roughly knee-deep. Vehicles unable to pass.",
      reporter: "Traffic Volunteer",
      timeAgo: "24 min ago",
      status: "Pending",
    },
    {
      id: 3,
      ward: "Ward 14",
      category: "Rescue Needed",
      description: "Elderly couple stranded on first floor, water rising near their home.",
      reporter: "Neighbor",
      timeAgo: "31 min ago",
      status: "Pending",
    },
    {
      id: 4,
      ward: "Ward 21",
      category: "Road Blocked",
      description: "Fallen tree blocking access road near the school.",
      reporter: "Local Resident",
      timeAgo: "45 min ago",
      status: "Verified",
    },
    {
      id: 5,
      ward: "Ward 6",
      category: "Power Outage",
      description: "Transformer tripped, entire block without power since morning.",
      reporter: "Ward Councillor",
      timeAgo: "1 hr ago",
      status: "Verified",
    },
    {
      id: 6,
      ward: "Ward 17",
      category: "Water Logging",
      description: "Minor pooling near the bus stand, receding slowly.",
      reporter: "Local Resident",
      timeAgo: "1 hr ago",
      status: "Rejected",
    },
    {
      id: 7,
      ward: "Ward 9",
      category: "Structural Damage",
      description: "Boundary wall collapsed onto footpath, no injuries reported.",
      reporter: "Shop Owner",
      timeAgo: "2 hr ago",
      status: "Verified",
    },
    {
      id: 8,
      ward: "Ward 14",
      category: "Road Blocked",
      description: "Debris and waterlogging blocking the ward 14 connector road.",
      reporter: "Delivery Rider",
      timeAgo: "2 hr ago",
      status: "Pending",
    },
  ];
}