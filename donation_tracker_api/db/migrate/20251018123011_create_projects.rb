class CreateProjects < ActiveRecord::Migration[8.0]
  def change
    create_table :projects do |t|
      t.string :title, null: false
      t.text :description
      t.integer :project_type, null: false, default: 0
      t.boolean :system, null: false, default: false

      t.timestamps
    end

    add_index :projects, :title
    add_index :projects, :system

    reversible do |dir|
      dir.up do
        execute <<-SQL
          INSERT INTO projects (title, description, project_type, system, created_at, updated_at)
          VALUES (
            'General Donation',
            'Default project for donations not assigned to a specific campaign or initiative',
            0,
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          );
        SQL
      end
    end
  end
end
