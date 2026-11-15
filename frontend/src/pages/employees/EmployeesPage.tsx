import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UserCheck,
  Search,
  Calendar,
  Building,
  Phone,
  Mail,
  DollarSign,
  Shield,
} from 'lucide-react';
import { employeesApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SearchSortControls } from '../../components/common/SearchSortControls';

export const EmployeesPage: React.FC = () => {
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', departmentFilter],
    queryFn: () => employeesApi.getEmployees({ department: departmentFilter }),
  });

  const visibleEmployees = employees.filter((employee) => `${employee.employee_code} ${employee.first_name} ${employee.last_name} ${employee.designation} ${employee.department} ${employee.email} ${employee.phone}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
    if (sort === 'department') return a.department.localeCompare(b.department);
    if (sort === 'salary_high') return b.salary - a.salary;
    if (sort === 'code') return a.employee_code.localeCompare(b.employee_code);
    return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Human Resources & Operations Roster"
        title="Staff Directory & Duty Rosters"
        description="Employee master records, operational department assignments, monthly payroll rates, and shift schedules."
      />

      {/* Department Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-hotel-line pb-4">
        {['', 'Management', 'Front Desk', 'Housekeeping', 'F&B', 'Maintenance', 'Accounts'].map(
          (dept) => (
            <button
              key={dept}
              onClick={() => setDepartmentFilter(dept)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                departmentFilter === dept
                  ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
                  : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
              }`}
            >
              {dept === '' ? 'All Departments' : dept}
            </button>
          )
        )}
      </div>

      <SearchSortControls search={search} onSearchChange={setSearch} sort={sort} onSortChange={setSort} resultCount={visibleEmployees.length} placeholder="Search name, employee code, role or contact..." sortOptions={[{ value: 'name', label: 'Employee name A–Z' }, { value: 'department', label: 'Department A–Z' }, { value: 'code', label: 'Employee code' }, { value: 'salary_high', label: 'Salary high to low' }]} />

      {/* Staff Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleEmployees.map((emp) => (
          <div
            key={emp.id}
            className="flex flex-col justify-between rounded-2xl border border-hotel-line bg-hotel-panel p-5 hover:border-hotel-gold/30 hover:shadow-[0_10px_35px_rgba(0,0,0,0.5)] transition-all"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-hotel-text">
                    {emp.first_name} {emp.last_name}
                  </h3>
                  <div className="text-[11px] text-hotel-accent font-medium">
                    {emp.designation}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-hotel-gold border border-hotel-gold/30 rounded px-1.5 py-0.5">
                  {emp.employee_code}
                </span>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-hotel-muted">
                <div className="flex items-center gap-2">
                  <Building className="h-3.5 w-3.5 shrink-0 text-hotel-gold" />
                  <span>Department: {emp.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{emp.phone}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-hotel-line pt-3 text-xs">
              <div>
                <span className="text-[10px] uppercase text-hotel-muted block">Monthly Base</span>
                <span className="font-serif font-bold text-hotel-gold">
                  {emp.salary.toLocaleString()} BDT
                </span>
              </div>
              <span className="rounded-full bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400 capitalize">
                {emp.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

