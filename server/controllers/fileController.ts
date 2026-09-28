import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../db/db';
import { AuthRequest, logAudit } from '../middleware/auth';
import { FileRecord } from '../db/schema';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOAD_DIR = isVercel ? path.resolve('/tmp', 'uploads') : path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error('[Uploads] Could not create upload directory:', err);
  }
}

export const getFiles = async (req: AuthRequest, res: Response) => {
  try {
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    const userId = req.user?.id;
    const { category, project_id, task_id, search } = req.query;

    let files = [...db.file_vault];

    // Access control: Non-admins can only see Public/Company or their own files or project files they belong to
    if (!isUserAdmin && userId) {
      files = files.filter((f) => {
        if (f.uploaded_by === userId) return true;
        if (f.access_level === 'Public' || f.access_level === 'Company') return true;
        if (f.related_project_id) {
          return db.project_members.some((pm) => pm.project_id === f.related_project_id && pm.user_id === userId);
        }
        return false;
      });
    }

    if (category) {
      files = files.filter((f) => f.category === category);
    }
    if (project_id) {
      files = files.filter((f) => f.related_project_id === project_id);
    }
    if (task_id) {
      files = files.filter((f) => f.related_task_id === task_id);
    }

    let results = files.map((f) => {
      const u = db.users.find((user) => user.id === f.uploaded_by);
      const prof = db.employee_profiles.find((p) => p.user_id === f.uploaded_by);
      const proj = f.related_project_id ? db.projects.find((p) => p.id === f.related_project_id) : null;

      return {
        ...f,
        uploaded_by_name: prof?.full_name || u?.username || 'Team Member',
        project_name: proj?.name || '',
      };
    });

    if (search) {
      const q = String(search).toLowerCase();
      results = results.filter((f) => f.original_name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
    }

    results.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

    return res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve files.' });
  }
};

export const uploadFile = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    const userId = req.user?.id;
    const { category = 'Company documents', related_project_id, related_task_id, access_level = 'Company' } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file was uploaded.' });
    }

    const now = new Date().toISOString();
    let storagePath = `/api/files/download/${file.filename}`;

    // If Supabase Storage is configured, attempt upload to Supabase Storage bucket 'opsnexus-vault'
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const fileBuffer = fs.readFileSync(file.path);
          const ext = path.extname(file.originalname);
          const supabasePath = `${category.replace(/\s+/g, '_').toLowerCase()}/${Date.now()}_${file.filename}`;

          const { data: uploadData, error } = await supabase.storage
            .from('opsnexus-vault')
            .upload(supabasePath, fileBuffer, {
              contentType: file.mimetype,
              upsert: true,
            });

          if (!error && uploadData) {
            const { data: publicUrlData } = supabase.storage.from('opsnexus-vault').getPublicUrl(uploadData.path);
            if (publicUrlData?.publicUrl) {
              storagePath = publicUrlData.publicUrl;
            }
          }
        } catch (sErr) {
          console.warn('[Supabase Storage] Fallback to local server storage:', sErr);
        }
      }
    }

    const newRecord: FileRecord = {
      id: crypto.randomUUID(),
      file_name: file.filename,
      original_name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
      storage_path: storagePath,
      category: category as any,
      uploaded_by: userId,
      related_project_id: related_project_id || null,
      related_task_id: related_task_id || null,
      access_level: access_level as any,
      created_at: now,
    };

    db.file_vault.push(newRecord);
    db.save();

    logAudit(req, 'FILE_UPLOADED', 'FILE', newRecord.id, {
      name: newRecord.original_name,
      size: newRecord.file_size,
      category: newRecord.category,
    });

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully.',
      data: newRecord,
    });
  } catch (err: any) {
    console.error('[Upload File Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to process file upload.' });
  }
};

export const downloadFile = async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.resolve(UPLOAD_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on storage server.' });
    }

    const fileRecord = db.file_vault.find((f) => f.file_name === filename);
    if (fileRecord) {
      res.setHeader('Content-Disposition', `inline; filename="${fileRecord.original_name}"`);
      res.setHeader('Content-Type', fileRecord.file_type);
    }

    return res.sendFile(filePath);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to download file.' });
  }
};

export const deleteFile = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';

    const index = db.file_vault.findIndex((f) => f.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const file = db.file_vault[index];
    if (!isUserAdmin && file.uploaded_by !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this file.' });
    }

    // Try removing local file if it exists
    const localPath = path.resolve(UPLOAD_DIR, file.file_name);
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch (e) {
        // ignore
      }
    }

    db.file_vault.splice(index, 1);
    db.save();

    logAudit(req, 'FILE_DELETED', 'FILE', id, { original_name: file.original_name });

    return res.json({ success: true, message: `File '${file.original_name}' deleted.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete file.' });
  }
};
