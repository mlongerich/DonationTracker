# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_11_26_223814) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "children", force: :cascade do |t|
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "discarded_at"
    t.string "gender"
    t.index ["discarded_at"], name: "index_children_on_discarded_at"
  end

  create_table "donations", force: :cascade do |t|
    t.decimal "amount"
    t.date "date"
    t.bigint "donor_id", null: false
    t.string "status", default: "succeeded", null: false
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "project_id"
    t.bigint "sponsorship_id"
    t.integer "child_id"
    t.string "stripe_charge_id"
    t.string "stripe_customer_id"
    t.string "stripe_subscription_id"
    t.string "stripe_invoice_id"
    t.string "payment_method"
    t.boolean "duplicate_subscription_detected", default: false
    t.text "needs_attention_reason"
    t.index ["child_id"], name: "index_donations_on_child_id"
    t.index ["date"], name: "index_donations_on_date"
    t.index ["donor_id"], name: "index_donations_on_donor_id"
    t.index ["payment_method"], name: "index_donations_on_payment_method"
    t.index ["project_id", "date"], name: "index_donations_on_project_id_and_date"
    t.index ["project_id"], name: "index_donations_on_project_id"
    t.index ["sponsorship_id"], name: "index_donations_on_sponsorship_id"
    t.index ["status"], name: "index_donations_on_status"
    t.index ["stripe_charge_id"], name: "index_donations_on_stripe_charge_id"
    t.index ["stripe_customer_id"], name: "index_donations_on_stripe_customer_id"
    t.index ["stripe_invoice_id"], name: "index_donations_on_stripe_invoice_id"
  end

  create_table "donors", force: :cascade do |t|
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "email"
    t.datetime "last_updated_at"
    t.datetime "discarded_at"
    t.integer "merged_into_id"
    t.string "phone"
    t.string "address_line1"
    t.string "address_line2"
    t.string "city"
    t.string "state"
    t.string "zip_code"
    t.string "country", default: "USA"
    t.index ["discarded_at"], name: "index_donors_on_discarded_at"
    t.index ["email"], name: "index_donors_on_email", unique: true
    t.index ["merged_into_id"], name: "index_donors_on_merged_into_id"
  end

  create_table "projects", force: :cascade do |t|
    t.string "title", null: false
    t.text "description"
    t.integer "project_type", default: 0, null: false
    t.boolean "system", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "discarded_at"
    t.index ["discarded_at"], name: "index_projects_on_discarded_at"
    t.index ["project_type"], name: "index_projects_on_project_type"
    t.index ["system"], name: "index_projects_on_system"
    t.index ["title"], name: "index_projects_on_title"
  end

  create_table "sponsorships", force: :cascade do |t|
    t.bigint "donor_id", null: false
    t.bigint "child_id", null: false
    t.bigint "project_id", null: false
    t.decimal "monthly_amount"
    t.date "end_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.date "start_date"
    t.index ["child_id"], name: "index_sponsorships_on_child_id"
    t.index ["donor_id", "child_id", "monthly_amount", "end_date"], name: "index_sponsorships_on_uniqueness_fields"
    t.index ["donor_id"], name: "index_sponsorships_on_donor_id"
    t.index ["end_date"], name: "index_sponsorships_on_end_date"
    t.index ["project_id"], name: "index_sponsorships_on_project_id"
  end

  create_table "stripe_invoices", force: :cascade do |t|
    t.string "stripe_invoice_id", null: false
    t.string "stripe_charge_id", null: false
    t.string "stripe_customer_id"
    t.string "stripe_subscription_id"
    t.integer "total_amount_cents", null: false
    t.date "invoice_date", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["stripe_charge_id"], name: "index_stripe_invoices_on_stripe_charge_id"
    t.index ["stripe_invoice_id"], name: "index_stripe_invoices_on_stripe_invoice_id", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "username"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "versions", force: :cascade do |t|
    t.string "whodunnit"
    t.datetime "created_at"
    t.bigint "item_id", null: false
    t.string "item_type", null: false
    t.string "event", null: false
    t.text "object"
    t.index ["item_type", "item_id"], name: "index_versions_on_item_type_and_item_id"
  end

  add_foreign_key "donations", "donors"
  add_foreign_key "donations", "projects"
  add_foreign_key "donations", "sponsorships"
  add_foreign_key "sponsorships", "children"
  add_foreign_key "sponsorships", "donors"
  add_foreign_key "sponsorships", "projects"
end
