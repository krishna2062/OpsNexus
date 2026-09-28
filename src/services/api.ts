const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

class ApiService {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string | null) => void)[] = [];

  private notifyRefreshSubscribers(token: string | null) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string | null) => void) {
    this.refreshSubscribers.push(cb);
  }

  private getHeaders(isFormData = false, customToken?: string): HeadersInit {
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const token = customToken || localStorage.getItem('opsnexus_token');
    if (token && token !== 'undefined' && token !== 'null' && token.trim().length > 10) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    } else if (token && (token === 'undefined' || token === 'null' || token.trim().length <= 10)) {
      localStorage.removeItem('opsnexus_token');
    }
    return headers;
  }

  private clearSessionAndNotify() {
    localStorage.removeItem('opsnexus_token');
    localStorage.removeItem('opsnexus_refresh');
    localStorage.removeItem('opsnexus_user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('opsnexus:auth_unauthorized'));
    }
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    const headers = this.getHeaders(isFormData);

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      });
    } catch (networkErr: any) {
      throw new Error(networkErr.message || 'Network request failed.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Handle 401 Unauthorized
      const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh');
      if (response.status === 401 && !isAuthEndpoint) {
        if (!isRetry) {
          const refreshToken = localStorage.getItem('opsnexus_refresh');
          if (refreshToken && refreshToken !== 'undefined' && refreshToken !== 'null' && refreshToken.trim().length > 10) {
            if (!this.isRefreshing) {
              this.isRefreshing = true;
              try {
                const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refreshToken }),
                });

                const refreshData = await refreshRes.json().catch(() => ({}));
                if (refreshRes.ok && refreshData.success && refreshData.data?.accessToken) {
                  const newAccessToken = refreshData.data.accessToken;
                  localStorage.setItem('opsnexus_token', newAccessToken);
                  this.isRefreshing = false;
                  this.notifyRefreshSubscribers(newAccessToken);
                  // Retry original request with new token
                  return this.request<T>(endpoint, options, true);
                } else {
                  this.isRefreshing = false;
                  this.notifyRefreshSubscribers(null);
                  this.clearSessionAndNotify();
                }
              } catch (refreshErr) {
                this.isRefreshing = false;
                this.notifyRefreshSubscribers(null);
                this.clearSessionAndNotify();
              }
            } else {
              // Wait for in-flight refresh to complete
              return new Promise<T>((resolve, reject) => {
                this.addRefreshSubscriber((newToken) => {
                  if (newToken) {
                    resolve(this.request<T>(endpoint, options, true));
                  } else {
                    reject(new Error(data.message || 'Session expired. Please log in again.'));
                  }
                });
              });
            }
          } else {
            this.clearSessionAndNotify();
          }
        } else {
          this.clearSessionAndNotify();
        }
      }

      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  }

  // Auth
  async login(credentials: { username: string; password: string }) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async firstLoginPasswordChange(passwords: { currentPassword?: string; newPassword: string; confirmPassword: string }) {
    return this.request('/auth/first-login-password-change', {
      method: 'POST',
      body: JSON.stringify(passwords),
    });
  }

  async changePassword(data: { currentPassword: string; newPassword: string; confirmPassword?: string }) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // Employees
  async getEmployees(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/employees${query ? `?${query}` : ''}`);
  }

  async getEmployeeById(id: string) {
    return this.request(`/employees/${id}`);
  }

  async createEmployee(data: any) {
    return this.request('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployee(id: string, data: any) {
    return this.request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateEmployeeStatus(id: string, status: string) {
    return this.request(`/employees/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async resetEmployeePassword(id: string, newPassword: string) {
    return this.request(`/employees/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  // Departments
  async getDepartments() {
    return this.request('/departments');
  }

  async createDepartment(data: any) {
    return this.request('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDepartment(id: string, data: any) {
    return this.request(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDepartment(id: string) {
    return this.request(`/departments/${id}`, { method: 'DELETE' });
  }

  // Attendance
  async getTodayAttendance() {
    return this.request('/attendance/today');
  }

  async checkIn(notes?: string) {
    return this.request('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async checkOut(notes?: string) {
    return this.request('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async getAttendanceList(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/attendance${query ? `?${query}` : ''}`);
  }

  async correctAttendance(id: string, data: any) {
    return this.request(`/attendance/${id}/correct`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Leaves
  async getLeaveTypes() {
    return this.request('/leaves/types');
  }

  async getLeaves(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/leaves${query ? `?${query}` : ''}`);
  }

  async submitLeave(data: any) {
    return this.request('/leaves', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reviewLeave(id: string, status: string, review_remarks?: string) {
    return this.request(`/leaves/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, review_remarks }),
    });
  }

  async cancelLeave(id: string) {
    return this.request(`/leaves/${id}/cancel`, { method: 'PATCH' });
  }

  // Projects
  async getProjects(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/projects${query ? `?${query}` : ''}`);
  }

  async getProjectById(id: string) {
    return this.request(`/projects/${id}`);
  }

  async createProject(data: any) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: any) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  async addProjectMember(id: string, data: { user_id: string; role_in_project?: string }) {
    return this.request(`/projects/${id}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeProjectMember(projectId: string, userId: string) {
    return this.request(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
  }

  // Tasks
  async getTasks(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tasks${query ? `?${query}` : ''}`);
  }

  async getTaskById(id: string) {
    return this.request(`/tasks/${id}`);
  }

  async createTask(data: any) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: any) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateTaskStatus(id: string, data: any) {
    return this.request(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async addTaskComment(taskId: string, comment: string) {
    return this.request(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  // Payroll
  async getPayroll(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/payroll${query ? `?${query}` : ''}`);
  }

  async createPayrollRecord(data: any) {
    return this.request('/payroll', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateMonthlyPayroll(month_year: string) {
    return this.request('/payroll/generate-monthly', {
      method: 'POST',
      body: JSON.stringify({ month_year }),
    });
  }

  async updatePayrollStatus(id: string, payment_status: string, payment_date?: string, notes?: string) {
    return this.request(`/payroll/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status, payment_date, notes }),
    });
  }

  async getPayrollSummary() {
    return this.request('/payroll/summary');
  }

  // Overtime
  async getOvertimeList(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/overtime${query ? `?${query}` : ''}`);
  }

  async submitOvertime(data: any) {
    return this.request('/overtime', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reviewOvertime(id: string, status: string) {
    return this.request(`/overtime/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Chat
  async getConversations() {
    return this.request('/chat/conversations');
  }

  async createConversation(data: any) {
    return this.request('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMessages(conversationId: string) {
    return this.request(`/chat/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId: string, data: any) {
    return this.request(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteMessage(messageId: string) {
    return this.request(`/chat/messages/${messageId}`, { method: 'DELETE' });
  }

  // Mail
  async getEmails(box = 'inbox', search?: string) {
    const params = new URLSearchParams({ box });
    if (search) params.append('search', search);
    return this.request(`/mail?${params.toString()}`);
  }

  async getEmailById(id: string) {
    return this.request(`/mail/${id}`);
  }

  async sendEmail(data: any) {
    return this.request('/mail', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmailStatus(id: string, data: any) {
    return this.request(`/mail/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Files
  async getFiles(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/files${query ? `?${query}` : ''}`);
  }

  async uploadFile(formData: FormData) {
    return this.request('/files/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteFile(id: string) {
    return this.request(`/files/${id}`, { method: 'DELETE' });
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'PATCH' });
  }

  // Announcements
  async getAnnouncements() {
    return this.request('/announcements');
  }

  async createAnnouncement(data: any) {
    return this.request('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAnnouncement(id: string) {
    return this.request(`/announcements/${id}`, { method: 'DELETE' });
  }

  // Reports & Analytics
  async getDashboardStats() {
    return this.request('/reports/dashboard');
  }

  async getAttendanceReport(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/attendance${query ? `?${query}` : ''}`);
  }

  // Audit Logs
  async getAuditLogs(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/audit-logs${query ? `?${query}` : ''}`);
  }

  // Settings
  async getSettings() {
    return this.request('/settings');
  }

  async updateCompanyProfile(data: any) {
    return this.request('/settings/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getSupabaseSql() {
    return this.request('/settings/supabase-sql');
  }

  async testSupabase() {
    return this.request('/settings/test-supabase', { method: 'POST' });
  }

  // Search
  async search(q: string) {
    return this.request(`/search?q=${encodeURIComponent(q)}`);
  }
}

export const api = new ApiService();
