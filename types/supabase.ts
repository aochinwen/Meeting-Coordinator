export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "meeting_checklist_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          date: string
          id: string
          name: string
        }
        Insert: {
          date: string
          id?: string
          name: string
        }
        Update: {
          date?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      initiative_slides: {
        Row: {
          created_at: string
          deleted_at: string | null
          description_md: string | null
          id: string
          initiative_id: string
          media_type: string
          position: number
          storage_path: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description_md?: string | null
          id?: string
          initiative_id: string
          media_type: string
          position: number
          storage_path?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description_md?: string | null
          id?: string
          initiative_id?: string
          media_type?: string
          position?: number
          storage_path?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "initiative_slides_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      initiatives: {
        Row: {
          created_at: string
          deleted_at: string | null
          demo_setup_md: string
          id: string
          narrative_md: string
          stage: string
          target_groups: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          demo_setup_md: string
          id?: string
          narrative_md: string
          stage: string
          target_groups?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          demo_setup_md?: string
          id?: string
          narrative_md?: string
          stage?: string
          target_groups?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      meeting_activities: {
        Row: {
          activity_type: string
          content: string
          created_at: string
          id: string
          meeting_id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          content: string
          created_at?: string
          id?: string
          meeting_id: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          content?: string
          created_at?: string
          id?: string
          meeting_id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_activities_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_checklist_tasks: {
        Row: {
          assigned_user_id: string | null
          created_at: string
          description: string
          due_days_before: number | null
          id: string
          is_completed: boolean
          meeting_id: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string
          description: string
          due_days_before?: number | null
          id?: string
          is_completed?: boolean
          meeting_id: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string
          description?: string
          due_days_before?: number | null
          id?: string
          is_completed?: boolean
          meeting_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_checklist_tasks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          id: string
          is_required: boolean | null
          meeting_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          meeting_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          meeting_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_series: {
        Row: {
          buffer_minutes: number | null
          chairman_id: string | null
          coordinator_id: string | null
          created_at: string
          created_by: string | null
          days_of_week: string[] | null
          description: string | null
          duration_minutes: number | null
          end_date: string | null
          end_time: string | null
          frequency: string
          id: string
          start_date: string
          start_time: string | null
          template_id: string | null
          timezone: string | null
          title: string
          updated_at: string
        }
        Insert: {
          buffer_minutes?: number | null
          chairman_id?: string | null
          coordinator_id?: string | null
          created_at?: string
          created_by?: string | null
          days_of_week?: string[] | null
          description?: string | null
          duration_minutes?: number | null
          end_date?: string | null
          end_time?: string | null
          frequency: string
          id?: string
          start_date: string
          start_time?: string | null
          template_id?: string | null
          timezone?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          buffer_minutes?: number | null
          chairman_id?: string | null
          coordinator_id?: string | null
          created_at?: string
          created_by?: string | null
          days_of_week?: string[] | null
          description?: string | null
          duration_minutes?: number | null
          end_date?: string | null
          end_time?: string | null
          frequency?: string
          id?: string
          start_date?: string
          start_time?: string | null
          template_id?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_series_chairman_id_fkey"
            columns: ["chairman_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_series_chairman_id_fkey"
            columns: ["chairman_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_series_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_series_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_series_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          chairman_id: string | null
          coordinator_id: string | null
          created_at: string
          date: string
          description: string | null
          end_time: string | null
          id: string
          instance_number: number | null
          is_override: boolean | null
          override_fields: Json | null
          room_id: string | null
          series_id: string | null
          start_time: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          chairman_id?: string | null
          coordinator_id?: string | null
          created_at?: string
          date: string
          description?: string | null
          end_time?: string | null
          id?: string
          instance_number?: number | null
          is_override?: boolean | null
          override_fields?: Json | null
          room_id?: string | null
          series_id?: string | null
          start_time?: string | null
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          chairman_id?: string | null
          coordinator_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          end_time?: string | null
          id?: string
          instance_number?: number | null
          is_override?: boolean | null
          override_fields?: Json | null
          room_id?: string | null
          series_id?: string | null
          start_time?: string | null
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_chairman_id_fkey"
            columns: ["chairman_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_chairman_id_fkey"
            columns: ["chairman_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "meeting_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          division: string | null
          email: string | null
          id: string
          name: string
          organization: string | null
          rank: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          division?: string | null
          email?: string | null
          id?: string
          name: string
          organization?: string | null
          rank?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          division?: string | null
          email?: string | null
          id?: string
          name?: string
          organization?: string | null
          rank?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      room_bookings: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          meeting_id: string | null
          room_id: string
          start_time: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          meeting_id?: string | null
          room_id: string
          start_time: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          meeting_id?: string | null
          room_id?: string
          start_time?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_bookings_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_checklist_tasks: {
        Row: {
          created_at: string
          description: string
          due_days_before: number | null
          id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          due_days_before?: number | null
          id?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          due_days_before?: number | null
          id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_checklist_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_participants: {
        Row: {
          created_at: string
          id: string
          person_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          person_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          person_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_participants_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_participants_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_participants_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          chairman_id: string | null
          coordinator_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          chairman_id?: string | null
          coordinator_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          chairman_id?: string | null
          coordinator_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_chairman_id_fkey"
            columns: ["chairman_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_chairman_id_fkey"
            columns: ["chairman_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          email: string
          id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email: string
          id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      users: {
        Row: {
          created_at: string | null
          division: string | null
          id: string | null
          name: string | null
          rank: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          division?: string | null
          id?: string | null
          name?: string | null
          rank?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          division?: string | null
          id?: string | null
          name?: string | null
          rank?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_admin_exists: {
        Args: { admin_email: string }
        Returns: {
          email: string
          user_exists: boolean
          user_id: string
        }[]
      }
      check_room_availability: {
        Args: {
          p_date: string
          p_end_time: string
          p_exclude_meeting_id?: string
          p_room_id: string
          p_start_time: string
        }
        Returns: boolean
      }
      get_available_rooms: {
        Args: {
          p_capacity?: number
          p_date: string
          p_end_time: string
          p_exclude_meeting_id?: string
          p_start_time: string
        }
        Returns: {
          room_capacity: number
          room_id: string
          room_name: string
        }[]
      }
      suggest_alternative_slots: {
        Args: {
          p_date: string
          p_duration_minutes: number
          p_room_id: string
          p_search_range_hours?: number
          p_start_time: string
        }
        Returns: {
          suggested_date: string
          suggested_end_time: string
          suggested_start_time: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
