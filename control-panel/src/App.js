import React, { useState, useEffect, useRef } from 'react';
import {
  Header,
  ThemeProvider,
  BaseStyles,
  Box,
  Heading,
  Button,
  TextInput,
  Text,
  ToggleSwitch,
  IconButton,
  FormControl,
  Select,
  StateLabel,
  Tooltip
} from '@primer/react';
import { DataTable, Table, Blankslate } from '@primer/react/experimental';
import { LightBulbIcon, PencilIcon, TrashIcon, BookIcon, CopyIcon } from '@primer/octicons-react';
import logo from './logo_aqua.svg';
import { v4 as uuidv4 } from 'uuid';
import { taskSchemes } from './taskSchemes'; // Import task schemes

const taskTypes = taskSchemes.reduce((acc, scheme) => {
  acc[scheme.group] = acc[scheme.group] || [];
  acc[scheme.group].push({ value: scheme.type, label: scheme.label });
  return acc;
}, {});

function App() {
  const [ip, setIp] = useState('Unknown');
  const [location, setLocation] = useState('Unknown');
  const [rows, setRows] = useState([]);
  const [newTask, setNewTask] = useState({
    type: 'unselected',
    content: {}
  });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskEngineRunning, setTaskEngineRunning] = useState(false);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const wsRef = useRef(null);

  const connectWebSocket = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost = window.location.hostname;
    const wsPort = '8889';
    const wsUrl = `${wsProtocol}://${wsHost}:${wsPort}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection opened');
      setWsStatus('connected');
      ws.send(JSON.stringify({ type: 'get-tasklist' }));
      ws.send(JSON.stringify({ type: 'get-task-engine-status' }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ip-update') {
        setIp(data.ip);
        setLocation(`${data.city}, ${data.country}`);
      } else if (data.type === 'tasklist-update') {
        setRows(data.tasklist);  // Update tasks list
      } else if (data.type === 'task-engine-status') {
        setTaskEngineRunning(data.running);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setWsStatus('disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsStatus('error');
    };
  };

  useEffect(() => {
    connectWebSocket();

    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
        console.log('Attempting to reconnect WebSocket...');
        connectWebSocket();
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const addRow = () => {
    if (newTask.type === 'unselected') {
      // Add reminder.
      return;
    }

    const newRow = { ...newTask, id: editingTaskId || uuidv4() };
    wsRef.current.send(JSON.stringify({ type: editingTaskId ? 'edit-task' : 'add-task', task: newRow }));
    setNewTask({
      type: 'unselected',
      content: {}
    });
    setEditingTaskId(null);
  };

  const deleteRow = (id) => {
    wsRef.current.send(JSON.stringify({ type: 'delete-task', id }));
  };

  const handleInputChange = (field, value) => {
    setNewTask({ ...newTask, content: { ...newTask.content, [field]: value } });
  };

  const handleTypeChange = (event) => {
    const selectedType = event.target.value;
    const selectedScheme = taskSchemes.find(scheme => scheme.type === selectedType);

    // Initialize content with default values
    const newContent = {};
    if (selectedScheme) {
      selectedScheme.inputs.forEach(input => {
        newContent[input.key] = input.options ? input.options[0].value : '';
      });
    }

    setNewTask({ type: selectedType, content: newContent });
  };

  const toggleTaskEngine = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'toggle-task-engine' }));
    } else {
      console.error('WebSocket is not open');
    }
  };

  const editRow = (id) => {
    const taskToEdit = rows.find(row => row.id === id);
    if (taskToEdit) {
      setNewTask(taskToEdit);
      setEditingTaskId(id);
    } else {
      console.error('Task not found for editing:', id);
    }
  };

  return (
    <ThemeProvider>
      <BaseStyles>
        <Box className="App">
          <Header>
            <Header.Item>
              <Header.Link href={window.location.href} sx={{ fontSize: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img height="32" src={logo} alt="Logo" width="32" />
                <span>Control Panel</span>
              </Header.Link>
            </Header.Item>
            <Header.Item full />
            <Header.Item sx={{ mr: 0 }}>
              <Box display="flex" flexDirection={['column', 'row']} alignItems={['flex-start', 'center']}>
                <Text mr={[0, 3]}>Agent IP: {ip}</Text>
                <Text>Location: {location}</Text>
              </Box>
            </Header.Item>
          </Header>

          <Box className="container p-3 content" sx={{ padding: '20px', maxWidth: '900px', margin: "0 auto" }}>
            <Box mb={4}>
              <Box className="Box-header" mb={3}>
                <Heading as="h2" className="Box-title">Task Engine Control</Heading>
              </Box>
              <Box className="Box-body">
                <Box display="flex" alignItems="center" mb={4}>
                  <Box flexGrow={1}>
                    <Text fontSize={2} fontWeight="bold" id="connectionLabel" display="block">
                      Connection Status
                    </Text>
                    <Text color="fg.subtle" fontSize={1} id="connectionCaption" display="block">
                      Status of your connection to the automation server.
                    </Text>
                  </Box>
                  <StateLabel status={wsStatus === 'connected' ? 'issueOpened' : 'pullClosed'}>{wsStatus === 'connected' ? 'Connected' : 'Disconnected'}</StateLabel>
                </Box>
                <Box display="flex" alignItems="start">
                  <Box flexGrow={1}>
                    <Text fontSize={2} fontWeight="bold" id="toggleLabel" display="block">
                      Automation Worker
                    </Text>
                    <Text color="fg.subtle" fontSize={1} id="toggleCaption" display="block">
                      Status of remote automation worker.
                    </Text>
                  </Box>
                  <ToggleSwitch
                    aria-labelledby="toggleLabel"
                    aria-describedby="toggleCaption"
                    checked={taskEngineRunning}
                    onClick={toggleTaskEngine}
                  />
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                borderWidth: 1,
                borderRadius: 2,
                borderStyle: 'solid',
                borderColor: 'border.default',
                p: 3,
                marginBottom: 3,
              }}
            >
              <Box className="Box-header" mb={3}>
                <Heading as="h3" className="Box-title">Add New Task</Heading>
              </Box>
              <Box className="Box-body">
                <Box
                  display="grid"
                  gridTemplateColumns={{
                    xs: "repeat(2, 1fr)", // For small screens
                    sm: "repeat(auto-fit, minmax(170px, 1fr))", // For larger screens
                  }}
                  gridGap={3}
                >
                  <FormControl sx={{ maxWidth: '170px' }}>
                    <FormControl.Label>Type</FormControl.Label>
                    <Select
                      value={newTask.type}
                      onChange={handleTypeChange}
                      block
                    >
                      <Select.Option value="unselected">Unselected</Select.Option>
                      {Object.keys(taskTypes).map(group => (
                        <Select.OptGroup key={group} label={group}>
                          {taskTypes[group].map(type => (
                            <Select.Option key={type.value} value={type.value}>
                              {type.label}
                            </Select.Option>
                          ))}
                        </Select.OptGroup>
                      ))}
                    </Select>
                  </FormControl>
                  {newTask.type !== 'unselected' && taskSchemes.find(scheme => scheme.type === newTask.type)?.inputs.map((input) => (
                    <FormControl key={input.key} sx={{ maxWidth: '170px' }}>
                      <FormControl.Label>
                        {input.label}
                        {input.tip && (
                          <Tooltip aria-label={input.tip} sx={{ marginLeft: '12px' }}>
                            <LightBulbIcon size={16} sx={{ color: "fgColor-upsell" }} />
                          </Tooltip>
                        )}
                      </FormControl.Label>
                      {
                        input.options ? (
                          <Select
                            value={newTask.content[input.key] || input.options[0].value}
                            onChange={(e) => handleInputChange(input.key, e.target.value)}
                            block
                          >
                            {input.options.map(option => (
                              <Select.Option key={option.value} value={option.value}>
                                {option.label}
                              </Select.Option>
                            ))}
                          </Select>
                        ) : (
                          <TextInput
                            value={newTask.content[input.key] || ''}
                            onChange={(e) => handleInputChange(input.key, e.target.value)}
                            placeholder={input.label}
                          />
                        )
                      }
                    </FormControl>
                  ))}
                  <Button onClick={addRow} variant="primary" block sx={{ mt: "25px", maxWidth: "170px" }}>
                    {editingTaskId ? 'Save Changes' : 'Add Task'}
                  </Button>
                </Box>
              </Box>
            </Box>


            <Box sx={{
              borderWidth: 1,
              borderRadius: 2,
              borderStyle: 'solid',
              borderColor: 'border.default',
              p: 3,
            }}>
              <Box className="overflow-auto" >
                {rows.length === 0 ? (
                  <Blankslate>
                    <Blankslate.Visual>
                      <BookIcon size="medium" />
                    </Blankslate.Visual>
                    <Blankslate.Heading>No Tasks</Blankslate.Heading>
                    <Blankslate.Description>
                      You currently have no tasks. Add a new task to get started.
                    </Blankslate.Description>
                  </Blankslate>
                ) : (
                  <Table.Container>
                    <Table.Title as="h3" id="task-list-title">
                      Task List
                    </Table.Title>
                    <DataTable
                      aria-labelledby="task-list-title"
                      data={rows}
                      columns={[
                        {
                          header: 'Type',
                          field: 'type',
                          rowHeader: true,
                        },
                        {
                          header: 'Content',
                          field: 'content',
                          renderCell: (row) => JSON.stringify(row.content),
                        },
                        {
                          header: 'Action',
                          field: 'action',
                          renderCell: (row) => (
                            <>
                              <IconButton
                                aria-label={`Edit: ${row.type}`}
                                title={`Edit: ${row.type}`}
                                icon={PencilIcon}
                                variant="invisible"
                                onClick={() => editRow(row.id)}
                              />
                              <IconButton
                                aria-label={`Delete: ${row.type}`}
                                title={`Delete: ${row.type}`}
                                icon={TrashIcon}
                                variant="invisible"
                                onClick={() => deleteRow(row.id)}
                              />
                              <Tooltip aria-label="Copy UUID">
                                <IconButton
                                  aria-label={`Delete: ${row.type}`}
                                  title={`Delete: ${row.type}`}
                                  icon={CopyIcon}
                                  variant="invisible"
                                  onClick={() => {
                                    navigator.clipboard.writeText(row.id).then(() => {
                                      console.log(`UUID ${row.id} copied to clipboard`);
                                    }).catch(err => {
                                      console.error('Failed to copy UUID: ', err);
                                    });
                                  }}
                                />
                              </Tooltip>
                            </>
                          ),
                        },
                      ]}
                    />
                  </Table.Container>
                )}
              </Box>
            </Box>

            <Box className="spacer" style={{ height: '60px' }}></Box>
          </Box>
        </Box>
      </BaseStyles>
    </ThemeProvider >
  );
}

export default App;
