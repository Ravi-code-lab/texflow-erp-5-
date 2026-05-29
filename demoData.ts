import { InventoryItem, ProductionJob, Order, Customer, TeamMember, Supplier, Design, JobWork, Machine, Project, Transaction, Agent, Karigar, AttendanceRecord, MaterialType, Unit } from './types';

export const demoInventory: InventoryItem[] = [
  { id: 'INV-101', name: 'Cotton 40s Combed Yarn', type: MaterialType.YARN, unit: Unit.KG, quantity: 1250, minStockLevel: 500, pricePerUnit: 280, location: 'Warehouse-A', hsnCode: '5205' },
  { id: 'INV-102', name: 'Polyester DTY 75/36', type: MaterialType.YARN, unit: Unit.KG, quantity: 800, minStockLevel: 300, pricePerUnit: 145, location: 'Warehouse-A', hsnCode: '5402' },
  { id: 'INV-103', name: 'Grey Satin Fabric (60")', type: MaterialType.FABRIC, unit: Unit.METER, quantity: 5000, minStockLevel: 1000, pricePerUnit: 45, location: 'Floor-1', hsnCode: '5208' },
  { id: 'INV-104', name: 'Reactive Blue Dye', type: MaterialType.DYE, unit: Unit.KG, quantity: 50, minStockLevel: 10, pricePerUnit: 1200, location: 'Chemical Room', hsnCode: '3204' },
  { id: 'INV-105', name: 'Designer Buttons - Pearl', type: MaterialType.ACCESSORY, unit: Unit.BOX, quantity: 100, minStockLevel: 20, pricePerUnit: 350, location: 'Accessory Store', hsnCode: '9606' }
];

export const demoCustomers: Customer[] = [
  { id: 'CUST-001', name: 'Surat Silk Emporium', type: 'WHOLESALER', contactPerson: 'Mr. Rajesh Shah', phone: '9825012345', address: 'Ring Road, Surat, Gujarat', gstin: '24ABCDE1234F1Z1' },
  { id: 'CUST-002', name: 'Mumbai Fashion Hub', type: 'RETAILER', contactPerson: 'Anjali Sharma', phone: '9122055667', address: 'Gandhi Market, Sion, Mumbai' }
];

export const demoSuppliers: Supplier[] = [
  { id: 'SUP-001', name: 'Vardhman Yarns Ltd', contactPerson: 'Amit Kumar', email: 'sales@vardhman.com', location: 'Ludhiana, Punjab', reliabilityScore: 95, materialsProvided: ['Cotton Yarn', 'Organic Cotton'] },
  { id: 'SUP-002', name: 'Reliance Petro-Fabrics', contactPerson: 'S. K. Mehta', email: 'ops@reliance.com', location: 'Patalganga, MH', reliabilityScore: 88, materialsProvided: ['Polyester', 'Nylon'] }
];

// Cleared all data except the required Admin login
export const demoTeam: TeamMember[] = [
  { id: 'TM-001', name: 'Admin', role: 'ADMIN', status: 'ACTIVE', dailyWage: 1500, email: 'admin@ravitextile.com' }
];

export const demoDesigns: Design[] = [
  { 
    // Fix: Replaced 'fabricType' with 'composition' and removed 'colors' as they were not defined in the Design interface
    id: 'DES-001', name: 'Floral Summer Saree', sku: 'SAR-FL-01', category: 'SAREE', composition: 'Georgette', 
    status: 'ACTIVE', processCostPerPiece: 450, targetMargin: 25,
    recipe: [
        { materialName: 'Grey Satin Fabric (60")', quantity: 5.5, unit: Unit.METER },
        { materialName: 'Reactive Blue Dye', quantity: 0.2, unit: Unit.KG }
    ]
  }
];

export const demoAssets: Machine[] = [
  { id: 'MAC-01', name: 'Loom-01 (Rapier)', type: 'LOOM', status: 'RUNNING', model: 'Dornier P1', purchaseDate: '2022-01-15', nextServiceDate: '2024-06-10' },
  { id: 'MAC-02', name: 'Loom-02 (Airjet)', type: 'LOOM', status: 'STOPPED', model: 'Tsudakoma ZAX', purchaseDate: '2022-03-20', nextServiceDate: '2024-05-05' },
  { id: 'MAC-03', name: 'Printing Unit-A', type: 'OTHER', status: 'RUNNING', model: 'Konica Minolta Nassenger', purchaseDate: '2023-08-10', nextServiceDate: '2024-08-10' }
];

export const demoKarigars: Karigar[] = [
  { id: 'KAR-001', name: 'Imran Ali', skill: 'Embroidery (Hand)', balance: 4500, ledger: [] },
  { id: 'KAR-002', name: 'Prakash Das', skill: 'Zardosi Master', balance: -1200, ledger: [] }
];

export const demoProjects: Project[] = [
  { id: 'PROJ-01', name: 'Diwali Collection 2024', status: 'PLANNING', startDate: '2024-05-01', endDate: '2024-09-30', budget: 500000, spent: 45000, description: 'Annual festive collection for high-end retail partners.', tasks: [], teamMembers: ['TM-001'] }
];