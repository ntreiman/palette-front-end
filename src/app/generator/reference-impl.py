import re


def read_gcode(file_path):
    with open(file_path, "r") as file:
        return file.readlines()


def write_gcode(file_path, lines):
    with open(file_path, "w") as file:
        for line in lines:
            file.write(line)


def find_single_layer_path(lines):
    g1_commands = []
    for line in lines:
        if line.startswith("G1"):
            g1_commands.append(line)
    return g1_commands


def interpolate_points(x1, y1, x2, y2, interpolation_step_size):
    dx, dy = x2 - x1, y2 - y1
    dist = (dx**2 + dy**2) ** 0.5
    num_points = int(dist / interpolation_step_size)
    points = [(x1, y1)]
    for i in range(1, num_points + 1):
        t = i / (num_points + 1)
        x = x1 + t * dx
        y = y1 + t * dy
        points.append((x, y))
    points.append((x2, y2))
    return points


def interpolate_gcode(g1_commands, interpolation_step_size):
    length = 0
    prev_x, prev_y = None, None
    new_lines = []
    for cmd in g1_commands:
        coords = re.findall(r"X([\d.]+) Y([\d.]+)", cmd)
        if coords:
            x, y = float(coords[0][0]), float(coords[0][1])
            if prev_x is not None:
                dist = ((x - prev_x) ** 2 + (y - prev_y) ** 2) ** 0.5
                length += dist
                if dist > interpolation_step_size:
                    # we need to interpolate
                    points = interpolate_points(
                        prev_x, prev_y, x, y, interpolation_step_size
                    )
                    for point in points[1:]:
                        new_lines.append(f"G1 X{point[0]:.3f} Y{point[1]:.3f} E0.05\n")
                else:
                    # we do not need to interpolate
                    new_lines.append(cmd)
            prev_x, prev_y = x, y

    return length, new_lines


def break_into_segments(
    g1_commands, path_length, percentages, gap_length, interpolation_points=100
):
    total_length = path_length - (len(percentages) - 1) * gap_length
    segment_lengths = [total_length * p for p in percentages]
    distance_to_go = segment_lengths[0]

    is_segment = True
    last_is_segment = False
    new_gcode = []
    current_length = 0
    segment_index = (
        0  # this should be set to the first segment index that isn't 0 length
    )
    while (
        segment_lengths[segment_index] == 0
    ):  # make this set segment index to the next thing that has length > 0
        segment_index += 1

    prev_x, prev_y = None, None
    gap_sum = 0
    new_gcode.append(f"T{segment_index+1}\n")  # Move to 0 mm on Z

    # new_gcode.append(f'G0 Z0\n')  # Move to 0 mm on Z
    for cmd in g1_commands:
        coords = re.findall(r"X([\d.]+) Y([\d.]+)", cmd)
        if coords:
            x, y = float(coords[0][0]), float(coords[0][1])
            if is_segment == True:
                # add unmodified gcode
                if last_is_segment == False:
                    new_gcode.append(
                        f"G0 X{x} Y{y} F5600 ;move to new start \n"
                    )  # Move to the next segment start position
                    new_gcode.append(
                        f"G0 Z{0 - 0.23*segment_index} ;move to printing z pos\n"
                    )
                    # new_gcode.append(f'M118 P2 S\{"n"\} ;start printing\n')  #start printing
                    new_gcode.append(f"G1 E1 f80 ;dwell \n")
                    new_gcode.append(f"G1 E1 f5600 ;dwell \n")

                    # new_gcode.append(f'G4 P200 ;more dwell\n') #insert dwell at start of each segment

                new_gcode.append(f"G1 X{x} Y{y} E0.2 F5600\n")
            last_is_segment = is_segment
            if prev_x is not None:
                segment = ((x - prev_x) ** 2 + (y - prev_y) ** 2) ** 0.5
                current_length += segment

                if current_length > distance_to_go:  # we hit the end
                    is_segment = not is_segment
                    if is_segment == False:  # do a gap
                        if segment_index >= len(percentages) - 1:
                            # end, no need for gap
                            new_gcode.append(f";Interrupted")
                            break
                        distance_to_go = gap_length
                        # new_gcode.append(f'stop extrusion\n')  # Send extrusion stop code
                        # new_gcode.append(f'T0\n')

                        new_gcode.append('M118 P2 S{"m"} ;stop printing\n')
                        new_gcode.append(f"G0 Z5\n")
                    else:  # dont do a gap

                        segment_index += 1

                        distance_to_go = segment_lengths[segment_index]
                        print(
                            f"{distance_to_go}, {segment_index}, is segment = {is_segment}"
                        )
                        startX, startY = x, y

                        new_gcode.append(
                            f"G0 X{startX} Y{startY} F5600 \n"
                        )  # Move to the next segment start position
                        new_gcode.append(f"T{segment_index+1}\n")  # Move to 0 mm on Z

                        # new_gcode.append(f'G0 Z0\n')  # Move to 0 mm on Z
                        # new_gcode.append(f'start extrusion\n')  # Send extrusion start code
                    current_length = 0
            prev_x, prev_y = x, y
        else:
            new_gcode.append(cmd + ";old")
    new_gcode.append('M118 P2 S{"m"} ;stop printing\n')
    new_gcode.append(f"G0 Z5\n")
    new_gcode.append(f";The End Bitch")
    return new_gcode


def generate_spiral(percentages, input_file, gap_length):
    gcode_lines = read_gcode(input_file)
    single_layer_path = find_single_layer_path(gcode_lines)

    # Define percentages here
    gap_length = 4  # Define gap_length
    path_length, interpolated_single_layer_path = interpolate_gcode(
        single_layer_path, 0.1
    )
    segmented_gcode = break_into_segments(
        interpolated_single_layer_path, path_length, percentages, gap_length
    )
    # Replace the single layer path with the segmented path in the original gcode
    output_gcode = []
    # initialX, initialY = 100, 100
    output_gcode.append(f"G0 Z5\n")
    # output_gcode.append(f'G0 X{initialX} Y{initialX}\n')
    single_layer_flag = False
    for line in gcode_lines:
        if line.startswith("G1") and not single_layer_flag:
            output_gcode.extend(segmented_gcode)
            single_layer_flag = True
        elif not line.startswith("G1"):
            output_gcode.append(line)
    return output_gcode


def main():
    output_file = "output.gcode"
    gap_length = 4
    y_spacing = 23
    input_percentages = [[]]
    input_files = {
        "final_circle.gcode",
        "final_diamond.gcode",
        "final_pentagon.gcode",
        "final_heart.gcode",
    }
    output_gcode = []
    originX, originY = 100, 100

    percentages = [0.6, 0.4, 0.0, 0.0, 0.0]
    input_percentages.append(percentages)
    input_percentages.append(percentages)
    input_percentages.append(percentages)
    input_percentages.append(percentages)
    input_percentages.append(percentages)

    # output_gcode.append(f'G91\n G0 Y{y_spacing}\n G90\n') #move to next space
    output_gcode.extend(f"G54\n")
    output_gcode.extend(f"G0 X150 Y0 Z20 f4000\n")
    output_gcode.extend(f"G55\n")
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend(
        "g10 p1 z{global.n_off_1}\n g10 p2 z{global.n_off_2}\n g10 p3 z{global.n_off_3}\n g10 p4 z{global.n_off_4}\n g10 p5 z{global.n_off_5}"
    )

    input_file = "final_pentagon.gcode"

    # for index, input_file in enumerate(input_files):
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.48, 0.32, 0.0, 0.0, 0.2]

    input_file = "final_heart.gcode"
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing-4.2} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.36, 0.24, 0.0, 0.0, 0.4]

    input_file = "final_circle.gcode"
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.24, 0.16, 0.0, 0.0, 0.6]

    input_file = "final_diamond.gcode"
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    output_gcode.extend(f"G54\n G0 Y0 F2000\n G55\n")  # move to next space
    output_gcode.extend(f"G91\n G0 Y27 F2000\n G90\n G55\n")  # move to next space

    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0

    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.0, 0.0, 0.0, 0.8, 0.2]

    input_file = "final_heart.gcode"

    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.0, 0.0, 0.0, 0.6, 0.4]

    input_file = "final_circle.gcode"
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing-4.2} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.0, 0.0, 0.0, 0.4, 0.6]

    input_file = "final_diamond.gcode"
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.0, 0.0, 0.0, 0.6, 0.4]

    input_file = "final_pentagon.gcode"
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    write_gcode(output_file, output_gcode)

    print("Segmented G-code has been saved to", output_file)


if __name__ == "__main__":
    main()
import re


def read_gcode(file_path):
    with open(file_path, "r") as file:
        return file.readlines()


def write_gcode(file_path, lines):
    with open(file_path, "w") as file:
        for line in lines:
            file.write(line)


def find_single_layer_path(lines):
    g1_commands = []
    for line in lines:
        if line.startswith("G1"):
            g1_commands.append(line)
    return g1_commands


def interpolate_points(x1, y1, x2, y2, interpolation_step_size):
    dx, dy = x2 - x1, y2 - y1
    dist = (dx**2 + dy**2) ** 0.5
    num_points = int(dist / interpolation_step_size)
    points = [(x1, y1)]
    for i in range(1, num_points + 1):
        t = i / (num_points + 1)
        x = x1 + t * dx
        y = y1 + t * dy
        points.append((x, y))
    points.append((x2, y2))
    return points


def interpolate_gcode(g1_commands, interpolation_step_size):
    length = 0
    prev_x, prev_y = None, None
    new_lines = []
    for cmd in g1_commands:
        coords = re.findall(r"X([\d.]+) Y([\d.]+)", cmd)
        if coords:
            x, y = float(coords[0][0]), float(coords[0][1])
            if prev_x is not None:
                dist = ((x - prev_x) ** 2 + (y - prev_y) ** 2) ** 0.5
                length += dist
                if dist > interpolation_step_size:
                    # we need to interpolate
                    points = interpolate_points(
                        prev_x, prev_y, x, y, interpolation_step_size
                    )
                    for point in points[1:]:
                        new_lines.append(f"G1 X{point[0]:.3f} Y{point[1]:.3f} E0.05\n")
                else:
                    # we do not need to interpolate
                    new_lines.append(cmd)
            prev_x, prev_y = x, y

    return length, new_lines


def break_into_segments(
    g1_commands, path_length, percentages, gap_length, interpolation_points=100
):
    total_length = path_length - (len(percentages) - 1) * gap_length
    segment_lengths = [total_length * p for p in percentages]
    distance_to_go = segment_lengths[0]

    is_segment = True
    last_is_segment = False
    new_gcode = []
    current_length = 0
    segment_index = (
        0  # this should be set to the first segment index that isn't 0 length
    )
    while (
        segment_lengths[segment_index] == 0
    ):  # make this set segment index to the next thing that has length > 0
        segment_index += 1

    prev_x, prev_y = None, None
    gap_sum = 0
    new_gcode.append(f"T{segment_index+1}\n")  # Move to 0 mm on Z

    # new_gcode.append(f'G0 Z0\n')  # Move to 0 mm on Z
    for cmd in g1_commands:
        coords = re.findall(r"X([\d.]+) Y([\d.]+)", cmd)
        if coords:
            x, y = float(coords[0][0]), float(coords[0][1])
            if is_segment == True:
                # add unmodified gcode
                if last_is_segment == False:
                    new_gcode.append(
                        f"G0 X{x} Y{y} F5600 ;move to new start \n"
                    )  # Move to the next segment start position
                    new_gcode.append(
                        f"G0 Z{0 - 0.23*segment_index} ;move to printing z pos\n"
                    )
                    # new_gcode.append(f'M118 P2 S\{"n"\} ;start printing\n')  #start printing
                    new_gcode.append(f"G1 E1 f80 ;dwell \n")
                    new_gcode.append(f"G1 E1 f5600 ;dwell \n")

                    # new_gcode.append(f'G4 P200 ;more dwell\n') #insert dwell at start of each segment

                new_gcode.append(f"G1 X{x} Y{y} E0.2 F5600\n")
            last_is_segment = is_segment
            if prev_x is not None:
                segment = ((x - prev_x) ** 2 + (y - prev_y) ** 2) ** 0.5
                current_length += segment

                if current_length > distance_to_go:  # we hit the end
                    is_segment = not is_segment
                    if is_segment == False:  # do a gap
                        if segment_index >= len(percentages) - 1:
                            # end, no need for gap
                            new_gcode.append(f";Interrupted")
                            break
                        distance_to_go = gap_length
                        # new_gcode.append(f'stop extrusion\n')  # Send extrusion stop code
                        # new_gcode.append(f'T0\n')

                        new_gcode.append('M118 P2 S{"m"} ;stop printing\n')
                        new_gcode.append(f"G0 Z5\n")
                    else:  # dont do a gap

                        segment_index += 1

                        distance_to_go = segment_lengths[segment_index]
                        print(
                            f"{distance_to_go}, {segment_index}, is segment = {is_segment}"
                        )
                        startX, startY = x, y

                        new_gcode.append(
                            f"G0 X{startX} Y{startY} F5600 \n"
                        )  # Move to the next segment start position
                        new_gcode.append(f"T{segment_index+1}\n")  # Move to 0 mm on Z

                        # new_gcode.append(f'G0 Z0\n')  # Move to 0 mm on Z
                        # new_gcode.append(f'start extrusion\n')  # Send extrusion start code
                    current_length = 0
            prev_x, prev_y = x, y
        else:
            new_gcode.append(cmd + ";old")
    new_gcode.append('M118 P2 S{"m"} ;stop printing\n')
    new_gcode.append(f"G0 Z5\n")
    new_gcode.append(f";The End Bitch")
    return new_gcode


def generate_spiral(percentages, input_file, gap_length):
    gcode_lines = read_gcode(input_file)
    single_layer_path = find_single_layer_path(gcode_lines)

    # Define percentages here
    gap_length = 4  # Define gap_length
    path_length, interpolated_single_layer_path = interpolate_gcode(
        single_layer_path, 0.1
    )
    segmented_gcode = break_into_segments(
        interpolated_single_layer_path, path_length, percentages, gap_length
    )
    # Replace the single layer path with the segmented path in the original gcode
    output_gcode = []
    # initialX, initialY = 100, 100
    output_gcode.append(f"G0 Z5\n")
    # output_gcode.append(f'G0 X{initialX} Y{initialX}\n')
    single_layer_flag = False
    for line in gcode_lines:
        if line.startswith("G1") and not single_layer_flag:
            output_gcode.extend(segmented_gcode)
            single_layer_flag = True
        elif not line.startswith("G1"):
            output_gcode.append(line)
    return output_gcode


def main():
    output_file = "output.gcode"
    gap_length = 4
    y_spacing = 23
    input_percentages = [[]]
    input_files = {
        "final_circle.gcode",
        "final_diamond.gcode",
        "final_pentagon.gcode",
        "final_heart.gcode",
    }
    output_gcode = []
    originX, originY = 100, 100

    percentages = [0.6, 0.4, 0.0, 0.0, 0.0]
    input_percentages.append(percentages)
    input_percentages.append(percentages)
    input_percentages.append(percentages)
    input_percentages.append(percentages)
    input_percentages.append(percentages)

    # output_gcode.append(f'G91\n G0 Y{y_spacing}\n G90\n') #move to next space
    output_gcode.extend(f"G54\n")
    output_gcode.extend(f"G0 X150 Y0 Z20 f4000\n")
    output_gcode.extend(f"G55\n")
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend(
        "g10 p1 z{global.n_off_1}\n g10 p2 z{global.n_off_2}\n g10 p3 z{global.n_off_3}\n g10 p4 z{global.n_off_4}\n g10 p5 z{global.n_off_5}"
    )

    input_file = "final_pentagon.gcode"

    # for index, input_file in enumerate(input_files):
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.48, 0.32, 0.0, 0.0, 0.2]

    input_file = "final_heart.gcode"
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing-4.2} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.36, 0.24, 0.0, 0.0, 0.4]

    input_file = "final_circle.gcode"
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.24, 0.16, 0.0, 0.0, 0.6]

    input_file = "final_diamond.gcode"
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    output_gcode.extend(f"G54\n G0 Y0 F2000\n G55\n")  # move to next space
    output_gcode.extend(f"G91\n G0 Y27 F2000\n G90\n G55\n")  # move to next space

    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0

    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.0, 0.0, 0.0, 0.8, 0.2]

    input_file = "final_heart.gcode"

    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.0, 0.0, 0.0, 0.6, 0.4]

    input_file = "final_circle.gcode"
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing-4.2} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.0, 0.0, 0.0, 0.4, 0.6]

    input_file = "final_diamond.gcode"
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    percentages = [0.0, 0.0, 0.0, 0.6, 0.4]

    input_file = "final_pentagon.gcode"
    new_gcode = generate_spiral(percentages, input_file, gap_length)
    output_gcode.extend(new_gcode)

    output_gcode.extend(f"T0\n")  # retract tools
    # output_gcode.extend(f'T1\n') #retract tools

    output_gcode.extend(f"G91\n G0 Z5\n G90\n G55\n")
    output_gcode.extend(f"G0 X0 F5600\n")

    output_gcode.extend(
        f"G91\n G0 Y{y_spacing} F2000\n G90\n G55\n"
    )  # move to next space
    output_gcode.extend(f"G10 L20 P2 X0 Y0\n")  # set x y to 0
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend('M118 P2 S{"m"} ;stop printing\n')
    output_gcode.extend(f"T0\n")  # retract tools

    write_gcode(output_file, output_gcode)

    print("Segmented G-code has been saved to", output_file)


if __name__ == "__main__":
    main()
