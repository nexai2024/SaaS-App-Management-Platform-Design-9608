import React, { useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiPlus, FiCheck, FiClock, FiAlertCircle } = FiIcons;

const TasksWidget = () => {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Fix authentication bug',
      app: 'TaskFlow Pro',
      priority: 'high',
      completed: false,
      dueDate: '2024-01-15'
    },
    {
      id: 2,
      title: 'Update pricing page',
      app: 'InvoiceGen',
      priority: 'medium',
      completed: true,
      dueDate: '2024-01-14'
    },
    {
      id: 3,
      title: 'Add payment integration',
      app: 'ChatBot Builder',
      priority: 'high',
      completed: false,
      dueDate: '2024-01-18'
    },
    {
      id: 4,
      title: 'Write documentation',
      app: 'Analytics Dashboard',
      priority: 'low',
      completed: false,
      dueDate: '2024-01-20'
    }
  ]);

  const toggleTask = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const activeTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
          <p className="text-sm text-gray-600">{activeTasks.length} pending, {completedTasks.length} completed</p>
        </div>
        <button className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
          <SafeIcon icon={FiPlus} className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`p-3 border rounded-lg transition-all ${
              task.completed ? 'bg-gray-50 border-gray-200' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start space-x-3">
              <button
                onClick={() => toggleTask(task.id)}
                className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  task.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-green-400'
                }`}
              >
                {task.completed && <SafeIcon icon={FiCheck} className="w-3 h-3" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${
                    task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                  }`}>
                    {task.title}
                  </h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-600">{task.app}</p>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <SafeIcon icon={FiClock} className="w-3 h-3" />
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all tasks
        </button>
      </div>
    </div>
  );
};

export default TasksWidget;