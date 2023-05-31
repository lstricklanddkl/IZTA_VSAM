#!/usr/bin/env python
import PySimpleGUI as sg
import pandas as pd
import xlwings as xw
#import re
"""
    Demonstration of MENUS!
    How do menus work?  Like buttons is how.
    Check out the variable menu_def for a hint on how to 
    define menus
"""
# Dataframes
maindf = pd.DataFrame() # extracted data from file
df = pd.DataFrame() # data filtered fom df

window_icon = r'C:\Users\lstrickland\PycharmProjects\VSAMGui\dataanalysis.ico'
windows = [] # array to store windows
data_for_windows = [] # array to store data in windows (used for sorting)

#filters
DSN_include_regex, DSN_exclude_regex = "",""
JOB_include_regex, JOB_exclude_regex = "",""
startDateTime, finishDateTime = "", ""
x, y = 100,100

main_win = None

def list_window(df,name):
    global x, y
    header_list = list(df.columns.values)
    data = df[0:].values.tolist()
    layout = [
        [sg.Text(text="Progress", key= '-Progress-')],
        [sg.Table(values=data,
                  headings=header_list,
                  display_row_numbers=False,
                  justification='right',
                  auto_size_columns=True,
                  alternating_row_color='lightblue',
                  key='-TABLE-',
                  selected_row_colors='red on yellow',
                  enable_events=True,
                  expand_x=True,
                  expand_y=True,
                  enable_click_events=True,
                  num_rows=min(25, len(data))),],
        [sg.Text(text = "", size = (60, 1), key = '-Selected-')],
        [sg.Button('Ok'), sg.Button('DSN Group by Job'), sg.Button('DSN Detail'), sg.Button('To Excel')],
        #[sg.Button('Ok'), sg.Button('DSN Group by Job'), sg.Button('DSN Detail'), sg.Button('To Excel'), sg.Text('   '),
        # sg.Button('Filter by Date Time'), sg.Button('Filter by R_JOB'),sg.Button('Filter by R_DSN'), sg.Button('Filter by max_size_gb')],
        
    ]
    x = x+20; y=y+20

    return sg.Window(name, layout, icon=window_icon, location = (x,y), grab_anywhere=False, finalize=True)

def main_window():
    sg.theme('Material1')
    sg.set_options(element_padding=(2, 2))

    # ------ Menu Definition ------ #
    menu_def = [['&File', ['&Open', 'E&xit']],
                ['F&ilters', ['&DateTime Range', 'R_&DSN Include (regex)', 'R_DSN &Exclude (regex)', 'R_&JOB Include (regex)', 'R_&JOB E&xclude (regex)'], ],
                ['&View', ['&Raw','&Filtered']],
                ['!&Help', '&About...'], ]

    #right_click_menu = ['Unused', ['Right', '!&Click', '&Menu', 'E&xit', 'Properties']]

    # ------ GUI Defintion ------ #
    layout = [
        [sg.Menu(menu_def, tearoff=False, pad=(200, 1))],
        #[sg.Text('Right click me for a right click menu example')],
        [sg.Output(size=(60, 20))],
        #[sg.ButtonMenu('ButtonMenu',  right_click_menu, key='-BMENU-'), sg.Button('Plain Button')],
    ]

    return sg.Window("Main Window",
                       layout,
                       default_element_size=(12, 1),
                       default_button_element_size=(12, 1),
                       #right_click_menu=right_click_menu,
                       icon=window_icon,
                       location = (x,y),
                       finalize=True)

   
def main():
    global startDateTime, finishDateTime, R_DSN_include, R_DSN_exclude, R_JOB_include, R_JOB_exclude
    global windows
    global data_for_windows
    #global df, maindf
    global main_win
    main_win = main_window()
    #windows.append(main_window())
    #data_for_windows.append(pd.DataFrame)
    # ------ Loop & Process button menu choices ------ #
    while True:
        window, event, values = sg.read_all_windows()
        
        # Get window index i
        i=0
        for win in windows:
            if window == win:  
                break
            i = i+1
        #print(i)
        if window == sg.WIN_CLOSED:     # if all windows were closed
            break
        if event == sg.WIN_CLOSED or event == 'Exit':
            window.close()
            if i < len(windows): # otherwise currently main window
                windows.pop(i)
                data_for_windows.pop(i)
           
       # print('window')
        #print(window)
        #print('event')
       # print(event)
        #print('values')
        #print(values)
        # ------ Process menu choices ------ #
        if event == 'About...':
            window.disappear()
            sg.popup('About this program', 'Version 1.0','Application written by Larry Strickland, no warrantee provided or implied',
                     'PySimpleGUI Version', sg.version,  grab_anywhere=True)
            window.reappear()
        elif event =='DateTime Range':
            getDateTimeRange()
        elif event =='R_DSN Include (regex)':
            getDSNInclude()
        elif event =='R_DSN Exclude (regex)':
            getDSNExclude()
        elif event =='R_JOB Include (regex)':
            getJOBInclude()
        elif event =='R_JOB Exclude (regex)':
            getJOBExclude()
        elif event == 'Open':
            filename = sg.popup_get_file(
                'filename to open', no_window=True, file_types=(("CSV Files", "*.csv"),))
            print('Loading and processing file:{}'.format(filename))
            if filename is not None:
                try:
                    process_file(filename)
                    clearAndLoadMaind()
                except:
                    sg.popup_error('Error reading file', icon=window_icon)
        elif event == 'To Excel':
           toExcel()
           
        elif event == 'Ok':
            window.close()
            windows.pop(i)
            data_for_windows.pop(i)
        elif event == 'Raw':
            windows.append(list_window(maindf, 'Raw'))
            data_for_windows.append(maindf)
            windows[-1]['-Progress-'].update('Raw')
        elif event == 'Filtered':
            windows.append(list_window(maindf, 'Filtered'))
            data_for_windows.append(df)
            windows[-1]['-Progress-'].update('Filtered')
        elif event == 'DSN Group by Job':
            if len(window['-Selected-'].get()) > 1:
                data_for_windows.append(groupByJOB(window['-Selected-'].get()))
                windows.append(list_window(data_for_windows[-1], window['-Selected-'].get() +' by R_JOB'))
                windows[-1]['-Progress-'].update(f'R_DSN={window["-Selected-"].get()}, Grouped R_JOB')
            else:
                sg.popup_error('Select row first')
        elif event == 'DSN Detail':
             if len(window['-Selected-'].get()) > 1:
                 data_for_windows.append(detail(window['-Selected-'].get()))
                 #.insert(0, "DSN", window['-Selected-'].get(), allow_duplicates=False)
                 windows.append(list_window(data_for_windows[-1], window['-Selected-'].get()))
                 windows[-1]['-Progress-'].update(f'R_DSN={window["-Selected-"].get()}')
             else:
                sg.popup_error('Select row first', icon=window_icon)

        if isinstance(event, tuple):
            # TABLE CLICKED Event has value in format ('-TABLE-', '+CLICKED+', (row,col))
            if event[0] == '-TABLE-':
                if event[2][0] == -1 and event[2][1] != -1:           # Header was clicked and wasn't the "row" column
                    col_num_clicked = event[2][1]
                    #col_name_clicked = window['-TABLE-'].headings[col_num_clicked]
                    header = data_for_windows[i].columns.values[col_num_clicked]
                    window['-Selected-'].update(f'Column Header ({event[2][1]}) clicked  {header}')
                    data_for_windows[i] = data_for_windows[i].sort_values(header, ascending=False)
                    data = data_for_windows[i][0:].values.tolist()
                    #new_table = sort_table(data[1:][:],(col_num_clicked, 0))
                    window['-TABLE-'].update(data)
                    #data = [data[0]] + new_table
                elif event[2][0] != -1 and event[2][1] != -1:
                    row_num_clicked = event[2][0]
                    #row_name_clicked = window.data_selected[0]
                    cell = data_for_windows[i]
                    window['-Selected-'].update(f'{cell.iloc[row_num_clicked][0]}')
                #window['-CLICKED-'].update(f'{event[2][0]},{event[2][1]}')
            

def toExcel():
    wb = xw.Book() # create a new workbook
    # for each openned window, create spreadsheet with window contents (in same order windows openned)
    for j in range(len(windows)-1, -1, -1):
        win_title = windows[j].Title
        if len(win_title)>31:
            win_title = win_title[0:30]
        sht = wb.sheets.add(win_title)
        sht.range('A1').options(index=False).value = data_for_windows[j]
        sht.used_range.select()              # Select the used range of the sheet.
        tbl_range = sht.range("A1").expand()
        sht.api.ListObjects.Add(1, sht.api.Range(tbl_range.address))
        sht.autofit(axis="columns")
    wb.sheets('Sheet1').delete()
    return

def getDateTimeRange():
    global startDateTime, finishDateTime
    newDateTime = sg.popup_get_text('Update start/finish Date Time (keep formating)', default_text=f'{startDateTime},{finishDateTime}', icon=window_icon)
    if newDateTime is not None:
        splitDateTime = newDateTime.split(',')
        if len(splitDateTime) == 2:
            if not pd.isnull(pd.to_datetime(splitDateTime[0],errors='coerce')) and not pd.isnull(pd.to_datetime(splitDateTime[1],errors='coerce')):
                if pd.to_datetime(splitDateTime[0],errors='coerce') < pd.to_datetime(splitDateTime[1],errors='coerce'):
                    startDateTime = splitDateTime[0]
                    finishDateTime = splitDateTime[1]
                    #Trigger refresh of windows
                    runFilter()
                    clearAndLoadMaind() # ideally refresh each window based on new filter - 
                else:
                    sg.popup_error('Start date time must be less than finish date time')
            else:
                sg.popup_error('Invalid date time format')
        else:
            sg.popup_error('two date times required')
    return

def getDSNInclude():
    global DSN_include_regex
    DSN_include_regex = sg.popup_get_text('Update REGEX to include DSN', default_text=f'{DSN_include_regex}', icon=window_icon)
    runFilter()
    clearAndLoadMaind()
    return

def getDSNExclude():
    global DSN_exclude_regex
    DSN_exclude_regex = sg.popup_get_text('Update REGEX to exclude DSN', default_text=f'{DSN_exclude_regex}', icon=window_icon)
    runFilter()
    clearAndLoadMaind()
    return

def getJOBInclude():
    global JOB_include_regex
    JOB_include_regex = sg.popup_get_text('Update REGEX to include JOB', default_text=f'{JOB_include_regex}', icon=window_icon)
    runFilter()
    clearAndLoadMaind()
    return

def getJOBExclude():
    global JOB_exclude_regex
    JOB_exclude_regex = sg.popup_get_text('Update REGEX to exclude JOB', default_text=f'{JOB_exclude_regex}', icon=window_icon)
    runFilter()
    clearAndLoadMaind()
    return

def runFilter():
    global df
    df = maindf[(maindf['DATETIME'] < pd.to_datetime(finishDateTime)) & (
                maindf['DATETIME'] > pd.to_datetime(startDateTime))]
    if JOB_exclude_regex:
        df=df[~df.R_JOB.str.contains(JOB_exclude_regex, regex= True, na=False)]
    if JOB_include_regex:
         df=df[df.R_JOB.str.contains(JOB_include_regex, regex= True, na=False)]
    if DSN_exclude_regex:
        df=df[~df.R_JOB.str.contains(DSN_exclude_regex, regex= True, na=False)]
    if DSN_include_regex:
         df=df[df.R_JOB.str.contains(DSN_include_regex, regex= True, na=False)]
    return

def clearAndLoadMaind():
    global windows, data_for_windows, x, y
    for j in range(len(windows)-1, -1, -1):
        windows[j].close()
        windows.pop(j)
        data_for_windows.pop(j)
    # clear filters
    x, y = 100, 100
    
    runFilter()
    data_for_windows.append(groupByDSN())
    windows.append(list_window(data_for_windows[-1], 'Group by DSN'))
    windows[-1]['-Progress-'].update('Grouped by DSN')
    return

def clearFilters():
    global DSN_include_regex, DSN_exclude_regex, JOB_include_regex, JOB_exclude_regex
    DSN_include_regex, DSN_exclude_regex = "",""
    JOB_include_regex, JOB_exclude_regex = "",""
    return

def groupByDSN():
    #filter with start and finish times
    df_dsn = df.groupby(['R_DSN'],as_index=False).agg(
        tot_excps=('EXCPS', 'sum'),
        tot_ins=('INSERTS', 'sum'),
        tot_del=('DELETE', 'sum'),
        tot_up=('UPDATE', 'sum'),
        tot_reads=('READS', 'sum'),
        max_size_gb=('SIZE', 'max'),
        max_records=('RECCNT', 'max'),
        open_close=('R_JOB', 'count'),
        unique_jobs=('R_JOB', 'nunique'),
        first=('DATETIME', 'min'),
        last=('DATETIME', 'max')
    ).sort_values('tot_excps', ascending=False)
    # df_dsn['tot_delta'] = df_dsn['tot_ins'] + df_dsn['tot_del'] + df_dsn['tot_up']
    return df_dsn

def groupByJOB(dsn):
    df_job = df[df['R_DSN'].str.fullmatch(dsn)].groupby(['R_DSN','R_JOB'],as_index=False).agg(
            tot_excps=('EXCPS', 'sum'),
            tot_ins=('INSERTS', 'sum'),
            tot_del=('DELETE', 'sum'),
            tot_up=('UPDATE', 'sum'),
            tot_reads=('READS', 'sum'),
            max_size_gb=('SIZE', 'max'),
            open_close=('R_JOB', 'count'),
            unique_jobs=('R_JOB', 'nunique')
        ).sort_values('tot_excps', ascending=False)
    return df_job

def detail(dsn):
    df_detail = df[df['R_DSN'].str.fullmatch(dsn)]
    return df_detail

def process_file(filename):
    global startDateTime
    global finishDateTime
    global maindf
    print('Processing .....')
    main_win.refresh()
    # count = 0
    d = dict()
    lines = []

    # Read in .csv file
    for line in open(filename):
        line = line.strip('\n')
        line = line.replace('\x00', '')
        line = line.replace(' ', '')
        d = line.split(',')
        if d[0]:
            if d[1]:
                if d[2]:
                    lines.append(d)

    # convert raw data to have useful columns
    df = pd.DataFrame(lines)
    df.columns = df.iloc[0]
    df = df.drop(df.index[0])

    # extract data time
    df.rename(columns={df.columns[15]: "TIME"}, inplace=True)
    df['DATETIME'] = pd.to_datetime(df['DATE'], format='%y%j') + pd.to_timedelta(df['TIME'])
    df.drop('TIME', axis=1, inplace=True)
    df.drop('DATE', axis=1, inplace=True)
    startDateTime = min(df['DATETIME'])
    finishDateTime = max(df['DATETIME'])
    # ensure numeric columns are in fact numeric
    numeric_cols = ['EXCPS', 'INSERTS', 'DELETE', 'UPDATE', 'READS', 'RECCNT', 'RECLEN', 'DATABUF', 'INDXBUF']
    df[numeric_cols] = pd.to_numeric(df[numeric_cols].stack(), errors='coerce').unstack()
    # calculate size of file
    df['SIZE'] = df['RECLEN'] * df['RECCNT'] / 1024 / 1024 / 1024
    # display(df.head())
    print('...... done')
    #pd.set_option('display.max_columns', None)
    #pd.set_option('display.width', 1000)
    # pd.set_option('display.max_rows', 10)
    # print(df.head())
    maindf = df[['R_DSN','R_JOB','R_DDN','R_DNM','EXCPS','INSERTS','DELETE','UPDATE','READS','RECCNT','RECLEN','DATABUF','INDXBUF','SID' ,'DATETIME','SIZE']]
    return 
    #return df
    

if __name__ == '__main__':
    main()