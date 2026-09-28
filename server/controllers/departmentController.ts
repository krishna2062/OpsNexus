import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/db';
import { AuthRequest, logAudit } from '../middleware/auth';
import { Department } from '../db/schema';

export const getDepartments = async (req: AuthRequest, res: Response) => {
  try {
    const departments = db.departments.map((dept) => {
      const members = db.employee_profiles.filter((p) => p.department_id === dept.id);
      let headName = 'Not Assigned';
      if (dept.department_head_id) {
        const headProfile = db.employee_profiles.find((p) => p.user_id === dept.department_head_id);
        const headUser = db.users.find((u) => u.id === dept.department_head_id);
        headName = headProfile?.full_name || headUser?.username || 'Not Assigned';
      }

      return {
        ...dept,
        member_count: members.length,
        department_head_name: headName,
      };
    });

    return res.json({
      success: true,
      count: departments.length,
      data: departments,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve departments.' });
  }
};

export const createDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, department_head_id, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }

    const cleanName = String(name).trim();
    if (db.departments.some((d) => d.name.toLowerCase() === cleanName.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Department with name '${cleanName}' already exists.`,
      });
    }

    const now = new Date().toISOString();
    const newDept: Department = {
      id: crypto.randomUUID(),
      name: cleanName,
      description: description || '',
      department_head_id: department_head_id || null,
      status: status || 'Active',
      created_at: now,
      updated_at: now,
    };

    db.departments.push(newDept);
    db.save();

    logAudit(req, 'DEPARTMENT_CREATED', 'DEPARTMENT', newDept.id, { name: cleanName });

    return res.status(201).json({
      success: true,
      message: `Department '${cleanName}' created successfully.`,
      data: newDept,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create department.' });
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, department_head_id, status } = req.body;

    const dept = db.departments.find((d) => d.id === id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    if (name) {
      const cleanName = String(name).trim();
      const duplicate = db.departments.find((d) => d.id !== id && d.name.toLowerCase() === cleanName.toLowerCase());
      if (duplicate) {
        return res.status(400).json({ success: false, message: `Another department named '${cleanName}' already exists.` });
      }
      dept.name = cleanName;
    }

    if (description !== undefined) dept.description = description;
    if (department_head_id !== undefined) dept.department_head_id = department_head_id || null;
    if (status) dept.status = status;

    dept.updated_at = new Date().toISOString();
    db.save();

    logAudit(req, 'DEPARTMENT_UPDATED', 'DEPARTMENT', id, { name: dept.name });

    return res.json({
      success: true,
      message: 'Department updated successfully.',
      data: dept,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update department.' });
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const index = db.departments.findIndex((d) => d.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const deptName = db.departments[index].name;

    // Unassign members
    db.employee_profiles.forEach((p) => {
      if (p.department_id === id) {
        p.department_id = null;
      }
    });

    db.departments.splice(index, 1);
    db.save();

    logAudit(req, 'DEPARTMENT_DELETED', 'DEPARTMENT', id, { name: deptName });

    return res.json({
      success: true,
      message: `Department '${deptName}' was deleted and member associations were cleared.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete department.' });
  }
};
