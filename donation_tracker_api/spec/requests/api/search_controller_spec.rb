# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Api::SearchController', type: :request do
  describe 'GET /api/search/project_or_child' do
    it 'returns empty arrays when query is blank' do
      get '/api/search/project_or_child'

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['projects']).to eq([])
      expect(json['children']).to eq([])
    end

    it 'returns empty arrays when query is empty string' do
      get '/api/search/project_or_child', params: { q: '' }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['projects']).to eq([])
      expect(json['children']).to eq([])
    end

    it 'searches projects by title (case-insensitive)' do
      project1 = Project.create!(title: 'Food Bank', project_type: 'general', system: false)
      project2 = Project.create!(title: 'Education Fund', project_type: 'general', system: false)
      project3 = Project.create!(title: 'Medical Supplies', project_type: 'general', system: false)

      get '/api/search/project_or_child', params: { q: 'food' }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['projects'].length).to eq(1)
      expect(json['projects'][0]['title']).to eq('Food Bank')
    end

    it 'searches children by name (case-insensitive)' do
      child1 = Child.create!(name: 'Maria Santos')
      child2 = Child.create!(name: 'Juan Rodriguez')
      child3 = Child.create!(name: 'Carlos Mendez')

      get '/api/search/project_or_child', params: { q: 'maria' }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['children'].length).to eq(1)
      expect(json['children'][0]['name']).to eq('Maria Santos')
    end

    it 'returns both projects and children when matches exist' do
      project = Project.create!(title: 'Education Fund', project_type: 'general', system: false)
      child = Child.create!(name: 'Maria Education')

      get '/api/search/project_or_child', params: { q: 'education' }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['projects'].length).to eq(1)
      expect(json['children'].length).to eq(1)
    end

    it 'limits project results to 5' do
      6.times do |i|
        Project.create!(title: "Project #{i}", project_type: 'general', system: false)
      end

      get '/api/search/project_or_child', params: { q: 'project' }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['projects'].length).to eq(5)
    end

    it 'limits children results to 5' do
      6.times do |i|
        Child.create!(name: "Child #{i}")
      end

      get '/api/search/project_or_child', params: { q: 'child' }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['children'].length).to eq(5)
    end

    it 'orders projects alphabetically by title' do
      Project.create!(title: 'Zebra Project', project_type: 'general', system: false)
      Project.create!(title: 'Alpha Project', project_type: 'general', system: false)
      Project.create!(title: 'Beta Project', project_type: 'general', system: false)

      get '/api/search/project_or_child', params: { q: 'project' }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['projects'][0]['title']).to eq('Alpha Project')
      expect(json['projects'][1]['title']).to eq('Beta Project')
      expect(json['projects'][2]['title']).to eq('Zebra Project')
    end

    it 'orders children alphabetically by name' do
      Child.create!(name: 'Zoe Smith')
      Child.create!(name: 'Alice Johnson')
      Child.create!(name: 'Bob Williams')

      get '/api/search/project_or_child', params: { q: 'o' }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['children'][0]['name']).to eq('Alice Johnson')
      expect(json['children'][1]['name']).to eq('Bob Williams')
      expect(json['children'][2]['name']).to eq('Zoe Smith')
    end

    it 'excludes discarded projects' do
      active_project = Project.create!(title: 'Active Project', project_type: 'general', system: false)
      discarded_project = Project.create!(title: 'Discarded Project', project_type: 'general', system: false)
      discarded_project.discard

      get '/api/search/project_or_child', params: { q: 'project' }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['projects'].length).to eq(1)
      expect(json['projects'][0]['title']).to eq('Active Project')
    end

    it 'excludes discarded children' do
      active_child = Child.create!(name: 'Active Child')
      discarded_child = Child.create!(name: 'Discarded Child')
      discarded_child.discard

      get '/api/search/project_or_child', params: { q: 'child' }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['children'].length).to eq(1)
      expect(json['children'][0]['name']).to eq('Active Child')
    end
  end
end
