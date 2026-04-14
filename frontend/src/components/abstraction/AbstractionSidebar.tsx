import { Checkbox } from '~/components/ui/checkbox';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
} from '~/components/ui/sidebar';

interface AbstractionSidebarProps {
    objectTypes: string[];
    getObjectColor: (objectType: string) => string;
    filteredObjectTypes: string[];
    onFilteredObjectTypesChange: (types: string[]) => void;
}

const AbstractionSidebar: React.FC<AbstractionSidebarProps> = ({
    objectTypes,
    getObjectColor,
    filteredObjectTypes,
    onFilteredObjectTypesChange,
}) => {
    const handleToggle = (ot: string) => {
        const next = filteredObjectTypes.includes(ot)
            ? filteredObjectTypes.filter((t) => t !== ot)
            : [...filteredObjectTypes, ot];
        onFilteredObjectTypesChange(next);
    };

    return (
        <Sidebar side="right">
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Project onto Object Type(s)</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem className="ml-1">
                                <div className="flex flex-col">
                                    {objectTypes.map((ot) => {
                                        const color = getObjectColor(ot);
                                        const checked = filteredObjectTypes.includes(ot);
                                        return (
                                            <div key={ot} className="flex items-center gap-2 py-1">
                                                <Checkbox
                                                    style={{
                                                        borderColor: color,
                                                        backgroundColor: checked ? color : 'white',
                                                    }}
                                                    checked={checked}
                                                    onCheckedChange={() => handleToggle(ot)}
                                                />
                                                <span className="text-sm">{ot}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
};

export default AbstractionSidebar;
